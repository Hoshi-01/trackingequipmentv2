import { google } from 'googleapis';
import {
    isValidNoSeri,
    normalizeHistoryAction,
    normalizeNoSeri,
    reconcileHistoryEvents,
} from '@/lib/history-reconciliation';

type EquipmentStatus = 'available' | 'borrowed' | 'maintenance';

interface SyncTargetState {
    status: EquipmentStatus;
    lokasi: string;
    peminjam: string;
}

export interface SyncEquipmentOptions {
    forceUpdateAll?: boolean;
    dryRun?: boolean;
}

export interface SyncChangePreview {
    rowNumber: number;
    nama: string;
    noSeri: string;
    before: SyncTargetState;
    after: SyncTargetState;
    reason: string;
}

export interface SyncEquipmentResult {
    updated: number;
    unchanged: number;
    dryRun: boolean;
    changes: SyncChangePreview[];
    stats: {
        total: number;
        active: number;
        inactive: number;
        available: number;
        borrowed: number;
        maintenance: number;
        historyRecords: number;
        validHistoryRecords: number;
        ignoredHistoryRecords: number;
        invalidActionRecords: number;
        duplicateCheckoutRecords: number;
        orphanCheckinRecords: number;
        uniqueEquipmentWithHistory: number;
        skippedNoSeriInvalid: number;
        skippedMaintenance: number;
    };
}

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function normalizeStatus(status: string): EquipmentStatus {
    const value = (status || '').toString().trim().toLowerCase();
    if (value === 'borrowed') return 'borrowed';
    if (value === 'maintenance') return 'maintenance';
    return 'available';
}

export async function syncEquipmentStatus(options: SyncEquipmentOptions = {}): Promise<SyncEquipmentResult> {
    const { forceUpdateAll = false, dryRun = false } = options;

    const equipmentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "'MASTER ALAT'!A2:K",
    });
    const historyResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Form Responses 1'!A2:I",
    });

    const equipmentRows = equipmentResponse.data.values || [];
    const historyRows = historyResponse.data.values || [];

    const parsedHistory = historyRows.map((row, index) => ({
        eventId: `row-${index + 2}`,
        timestamp: row[0] || '',
        noSeri: (row[4] || '').toString(),
        aksi: normalizeHistoryAction(row[5]),
        teknisi: row[6] || '',
        lokasi: row[7] || '',
    }));
    const reconciliation = reconcileHistoryEvents(parsedHistory);
    const latestStatusMap = reconciliation.states;
    const validHistoryRecords = reconciliation.validEventCount;
    const ignoredHistoryRecords = reconciliation.ignoredNoSeriCount;
    const invalidActionRecords = reconciliation.issues.filter((item) => item.issueType !== 'invalid_no_seri').length;
    const duplicateCheckoutRecords = reconciliation.issues.filter(
        (item) => item.issueType === 'duplicate_checkout'
    ).length;
    const orphanCheckinRecords = reconciliation.issues.filter((item) => item.issueType === 'orphan_checkin').length;
    const nowIso = new Date().toISOString();

    const updateData: { range: string; values: string[][] }[] = [];
    const changes: SyncChangePreview[] = [];
    let updated = 0;
    let unchanged = 0;
    let available = 0;
    let borrowed = 0;
    let maintenance = 0;
    let inactive = 0;
    let skippedNoSeriInvalid = 0;
    let skippedMaintenance = 0;

    equipmentRows.forEach((row, index) => {
        const rowNumber = index + 2;
        const kondisi = (row[8] || 'Aktif').toString().trim();
        const currentStatus = normalizeStatus((row[4] || 'available').toString());
        const currentLokasi = (row[5] || 'Gudang').toString();
        const currentPeminjam = (row[6] || '-').toString();

        if (kondisi.toLowerCase() !== 'aktif') {
            inactive++;
            unchanged++;
            return;
        }

        if (currentStatus === 'maintenance') {
            maintenance++;
            skippedMaintenance++;
            unchanged++;
            return;
        }

        const noSeriKey = normalizeNoSeri((row[3] || '').toString());
        if (!isValidNoSeri(noSeriKey)) {
            skippedNoSeriInvalid++;
            if (currentStatus === 'borrowed') borrowed++;
            else available++;
            unchanged++;
            return;
        }

        const latest = latestStatusMap.get(noSeriKey);
        const target: SyncTargetState = latest
            ? {
                status: latest.status,
                peminjam: latest.peminjam,
                lokasi: latest.lokasi,
            }
            : {
                status: 'available',
                peminjam: '-',
                lokasi: 'Gudang',
            };

        if (target.status === 'borrowed') borrowed++;
        else available++;

        const hasChanged =
            currentStatus !== target.status ||
            currentLokasi !== target.lokasi ||
            currentPeminjam !== target.peminjam;

        if (forceUpdateAll || hasChanged) {
            updated++;
            const changedFields: string[] = [];
            if (currentStatus !== target.status) changedFields.push('status');
            if (currentLokasi !== target.lokasi) changedFields.push('lokasi');
            if (currentPeminjam !== target.peminjam) changedFields.push('peminjam');

            changes.push({
                rowNumber,
                nama: (row[0] || '').toString(),
                noSeri: (row[3] || '').toString(),
                before: {
                    status: currentStatus,
                    lokasi: currentLokasi,
                    peminjam: currentPeminjam,
                },
                after: target,
                reason: changedFields.length > 0 ? `changed:${changedFields.join(',')}` : 'force-update',
            });

            if (!dryRun) {
                updateData.push({
                    range: `'MASTER ALAT'!E${rowNumber}:H${rowNumber}`,
                    values: [[target.status, target.lokasi, target.peminjam, nowIso]],
                });
            }
            return;
        }

        unchanged++;
    });

    if (!dryRun && updateData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updateData,
            },
        });
    }

    return {
        updated,
        unchanged,
        dryRun,
        changes,
        stats: {
            total: equipmentRows.length,
            active: equipmentRows.length - inactive,
            inactive,
            available,
            borrowed,
            maintenance,
            historyRecords: historyRows.length,
            validHistoryRecords,
            ignoredHistoryRecords,
            invalidActionRecords,
            duplicateCheckoutRecords,
            orphanCheckinRecords,
            uniqueEquipmentWithHistory: latestStatusMap.size,
            skippedNoSeriInvalid,
            skippedMaintenance,
        },
    };
}
