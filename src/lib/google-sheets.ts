import { google } from 'googleapis';
import { normalizeHistoryAction } from '@/lib/history-reconciliation';

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

// Sheet names - match existing sheets
const SHEETS = {
    EQUIPMENT: 'MASTER ALAT',
    HISTORY: 'Form Responses 1',
    USERS: 'Users',
};

// Helper to quote sheet names with spaces for ranges
const quoteSheet = (name: string) => `'${name}'`;

function columnToLetter(columnNumber: number): string {
    let num = columnNumber;
    let result = '';
    while (num > 0) {
        const modulo = (num - 1) % 26;
        result = String.fromCharCode(65 + modulo) + result;
        num = Math.floor((num - modulo) / 26);
    }
    return result;
}

export interface Equipment {
    id: string;
    nama: string;
    merk: string;
    tipe: string;
    noSeri: string;
    status: 'available' | 'borrowed' | 'maintenance';
    prioritas: EquipmentPriority;
    lokasi: string;
    peminjam?: string;
    lastUpdate?: string;
    kondisi: 'Aktif' | 'Tidak Aktif';
    keterangan?: string;
    kalibrasiTerakhir?: string;
    intervalKalibrasiBulan?: number;
    kalibrasiBerikutnya?: string;
    noSertifikatKalibrasi?: string;
    labKalibrasi?: string;
    biayaKalibrasi?: string;
    urlSertifikatKalibrasi?: string;
}

export type EquipmentPriority = 'NONE' | 'P1' | 'P2' | 'P3';

export function normalizePriority(value: string | undefined | null): EquipmentPriority {
    const cleaned = (value || '').toString().trim().toUpperCase();
    if (cleaned === 'P1' || cleaned === 'P2' || cleaned === 'P3') return cleaned;
    return 'NONE';
}

const EQUIPMENT_HEADERS = [
    'Nama',
    'Merk',
    'Tipe',
    'No.Seri',
    'Status',
    'Lokasi',
    'Peminjam',
    'LastUpdate',
    'KONDISI',
    'KETERANGAN',
    'PRIORITAS',
    'KALIBRASI_TERAKHIR',
    'INTERVAL_KALIBRASI_BULAN',
    'KALIBRASI_BERIKUTNYA',
    'NO_SERTIFIKAT',
    'LAB_KALIBRASI',
    'BIAYA_KALIBRASI',
    'URL_SERTIFIKAT',
];

function parseCalibrationInterval(rawValue: unknown): number {
    const parsed = Number((rawValue ?? '').toString().trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return 12;
    return Math.round(parsed);
}

function normalizeDateString(rawValue: unknown): string {
    const value = (rawValue ?? '').toString().trim();
    if (
        !value ||
        /^0+$/.test(value) ||
        value === '0001-01-01' ||
        value === '01/01/0001' ||
        value === '1/1/0001'
    ) {
        return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().split('T')[0];
}

export interface HistoryRecord {
    timestamp: string;
    nama: string;
    merk: string;
    tipe: string;
    noSeri: string;
    aksi: 'checkout' | 'checkin';
    teknisi: string;
    lokasi: string;
    catatan: string;
    // Matched with MASTER ALAT
    isMatched: boolean;
    matchedNama?: string;
    matchedMerk?: string;
    matchedTipe?: string;
}

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'user';
    name: string;
}

// ==================== EQUIPMENT CRUD ====================

export async function getAllEquipment(includeInactive = false): Promise<Equipment[]> {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${quoteSheet(SHEETS.EQUIPMENT)}!A2:R`,
        });

        const rows = response.data.values || [];
        const equipment = rows.map((row, index) => ({
            id: String(index + 1),
            nama: row[0] || '',
            merk: row[1] || '',
            tipe: row[2] || '',
            noSeri: row[3] || '-',
            status: (row[4] as Equipment['status']) || 'available',
            prioritas: normalizePriority(row[10]),
            lokasi: row[5] || 'Gudang',
            peminjam: row[6] || '-',
            lastUpdate: row[7] || '',
            kondisi: (row[8] as Equipment['kondisi']) || 'Aktif',
            keterangan: row[9] || '',
            kalibrasiTerakhir: normalizeDateString(row[11]),
            intervalKalibrasiBulan: parseCalibrationInterval(row[12]),
            kalibrasiBerikutnya: normalizeDateString(row[13]),
            noSertifikatKalibrasi: row[14] || '',
            labKalibrasi: row[15] || '',
            biayaKalibrasi: row[16] || '',
            urlSertifikatKalibrasi: row[17] || '',
        }));

        // Filter only active equipment unless includeInactive is true
        if (!includeInactive) {
            return equipment.filter(e => e.kondisi === 'Aktif');
        }
        return equipment;
    } catch (error) {
        console.error('Error fetching equipment:', error);
        throw error;
    }
}

export async function addEquipment(equipment: Omit<Equipment, 'id'>): Promise<void> {
    try {
        const kalibrasiTerakhir = normalizeDateString(equipment.kalibrasiTerakhir);
        const intervalKalibrasiBulan = parseCalibrationInterval(equipment.intervalKalibrasiBulan);
        const kalibrasiBerikutnya = normalizeDateString(equipment.kalibrasiBerikutnya);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${quoteSheet(SHEETS.EQUIPMENT)}!A:R`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    equipment.nama,
                    equipment.merk,
                    equipment.tipe,
                    equipment.noSeri,
                    equipment.status || 'available',
                    equipment.lokasi || 'Gudang',
                    equipment.peminjam || '-',
                    new Date().toISOString(),
                    equipment.kondisi || 'Aktif',
                    equipment.keterangan || '',
                    normalizePriority(equipment.prioritas),
                    kalibrasiTerakhir,
                    intervalKalibrasiBulan,
                    kalibrasiBerikutnya,
                    equipment.noSertifikatKalibrasi || '',
                    equipment.labKalibrasi || '',
                    equipment.biayaKalibrasi || '',
                    equipment.urlSertifikatKalibrasi || '',
                ]],
            },
        });
    } catch (error) {
        console.error('Error adding equipment:', error);
        throw error;
    }
}

export async function updateEquipment(rowIndex: number, equipment: Partial<Equipment>): Promise<void> {
    try {
        const range = `${quoteSheet(SHEETS.EQUIPMENT)}!A${rowIndex + 2}:R${rowIndex + 2}`;

        // Get current data first
        const current = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });

        const currentRow = current.data.values?.[0] || [];
        const nextCalibrationLast =
            equipment.kalibrasiTerakhir !== undefined
                ? normalizeDateString(equipment.kalibrasiTerakhir)
                : normalizeDateString(currentRow[11]);
        const nextCalibrationInterval =
            equipment.intervalKalibrasiBulan !== undefined
                ? parseCalibrationInterval(equipment.intervalKalibrasiBulan)
                : parseCalibrationInterval(currentRow[12]);
        const providedNextCalibrationDate =
            equipment.kalibrasiBerikutnya !== undefined
                ? normalizeDateString(equipment.kalibrasiBerikutnya)
                : normalizeDateString(currentRow[13]);

        const updatedRow = [
            equipment.nama ?? currentRow[0],
            equipment.merk ?? currentRow[1],
            equipment.tipe ?? currentRow[2],
            equipment.noSeri ?? currentRow[3],
            equipment.status ?? currentRow[4],
            equipment.lokasi ?? currentRow[5],
            equipment.peminjam ?? currentRow[6],
            new Date().toISOString(),
            equipment.kondisi ?? currentRow[8] ?? 'Aktif',
            equipment.keterangan ?? currentRow[9] ?? '',
            equipment.prioritas !== undefined
                ? normalizePriority(equipment.prioritas)
                : normalizePriority(currentRow[10]),
            nextCalibrationLast,
            nextCalibrationInterval,
            providedNextCalibrationDate,
            equipment.noSertifikatKalibrasi ?? currentRow[14] ?? '',
            equipment.labKalibrasi ?? currentRow[15] ?? '',
            equipment.biayaKalibrasi ?? currentRow[16] ?? '',
            equipment.urlSertifikatKalibrasi ?? currentRow[17] ?? '',
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [updatedRow] },
        });
    } catch (error) {
        console.error('Error updating equipment:', error);
        throw error;
    }
}

export async function deleteEquipment(rowIndex: number): Promise<void> {
    try {
        // Get sheet ID first
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const sheet = spreadsheet.data.sheets?.find(
            s => s.properties?.title === SHEETS.EQUIPMENT
        );
        const sheetId = sheet?.properties?.sheetId;

        if (sheetId === undefined) throw new Error('Sheet not found');

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 for header
                            endIndex: rowIndex + 2,
                        },
                    },
                }],
            },
        });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        throw error;
    }
}

// Deactivate equipment instead of deleting (preserves history)
export async function deactivateEquipment(rowIndex: number, keterangan: string): Promise<void> {
    try {
        const range = `${quoteSheet(SHEETS.EQUIPMENT)}!I${rowIndex + 2}:J${rowIndex + 2}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Tidak Aktif', keterangan]],
            },
        });
    } catch (error) {
        console.error('Error deactivating equipment:', error);
        throw error;
    }
}

// ==================== HISTORY ====================

export async function getHistory(): Promise<HistoryRecord[]> {
    try {
        // Fetch Form Responses
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEETS.HISTORY}'!A2:I`,
        });

        // Fetch MASTER ALAT for cross-reference
        const equipmentResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${quoteSheet(SHEETS.EQUIPMENT)}!A2:D`,
        });

        // Build equipment lookup map by NoSeri (normalized)
        const equipmentMap = new Map<string, { nama: string; merk: string; tipe: string }>();
        const equipmentRows = equipmentResponse.data.values || [];
        equipmentRows.forEach(row => {
            const noSeri = (row[3] || '').toString().trim().toLowerCase();
            if (noSeri && noSeri !== '-') {
                equipmentMap.set(noSeri, {
                    nama: row[0] || '',
                    merk: row[1] || '',
                    tipe: row[2] || '',
                });
            }
        });

        const rows = response.data.values || [];
        return rows.map(row => {
            const rawNoSeri = (row[4] || '').toString();
            const normalizedNoSeri = rawNoSeri.trim().toLowerCase();
            const matchedEquipment = equipmentMap.get(normalizedNoSeri);

            return {
                timestamp: row[0] || '',
                // Use matched data from MASTER ALAT if available
                nama: matchedEquipment?.nama || row[1] || '',
                merk: matchedEquipment?.merk || row[2] || '',
                tipe: matchedEquipment?.tipe || row[3] || '',
                noSeri: rawNoSeri || '-',
                aksi: normalizeHistoryAction(row[5]),
                teknisi: row[6] || '',
                lokasi: row[7] || '',
                catatan: row[8] || '',
                // Matching info
                isMatched: !!matchedEquipment,
                matchedNama: matchedEquipment?.nama,
                matchedMerk: matchedEquipment?.merk,
                matchedTipe: matchedEquipment?.tipe,
            };
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        throw error;
    }
}

// Add new history record (for admin actions like manual return)
export async function addHistory(record: {
    nama: string;
    merk: string;
    tipe: string;
    noSeri: string;
    aksi: 'Pengembalian' | 'Peminjaman';
    teknisi: string;
    lokasi: string;
    catatan?: string;
}): Promise<void> {
    try {
        // Format timestamp as DD/MM/YYYY HH:MM:SS (same as Google Form)
        const now = new Date();
        const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const values = [[
            timestamp,
            record.nama,
            record.merk,
            record.tipe,
            record.noSeri,
            record.aksi,
            record.teknisi,
            record.lokasi,
            record.catatan || '',
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${quoteSheet(SHEETS.HISTORY)}!A:I`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS', // Force insert new rows instead of overwriting
            requestBody: {
                values: values,
            },
        });
    } catch (error) {
        console.error('Error adding history:', error);
        throw error;
    }
}

// ==================== ENSURE SHEETS EXIST ====================

export async function ensureSheetsExist(): Promise<void> {
    try {
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

        const sheetsToCreate: string[] = [];
        if (!existingSheets.includes(SHEETS.EQUIPMENT)) sheetsToCreate.push(SHEETS.EQUIPMENT);
        if (!existingSheets.includes(SHEETS.USERS)) sheetsToCreate.push(SHEETS.USERS);

        if (sheetsToCreate.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: sheetsToCreate.map(title => ({
                        addSheet: { properties: { title } },
                    })),
                },
            });

            // Add headers to new sheets
            if (sheetsToCreate.includes(SHEETS.EQUIPMENT)) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${quoteSheet(SHEETS.EQUIPMENT)}!A1:R1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [EQUIPMENT_HEADERS],
                    },
                });
            }

            if (sheetsToCreate.includes(SHEETS.USERS)) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEETS.USERS}!A1:E1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [['ID', 'Username', 'PasswordHash', 'Role', 'Name']],
                    },
                });
            }
        }

        // Backward-compatible schema upgrade.
        const equipmentHeaderResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${quoteSheet(SHEETS.EQUIPMENT)}!A1:R1`,
        });
        const header = equipmentHeaderResponse.data.values?.[0] || [];

        const headerUpdates = EQUIPMENT_HEADERS
            .map((expected, index) => {
                const actual = (header[index] || '').toString().trim().toUpperCase();
                if (actual === expected.toUpperCase()) return null;
                return {
                    range: `${quoteSheet(SHEETS.EQUIPMENT)}!${columnToLetter(index + 1)}1`,
                    values: [[expected]],
                };
            })
            .filter((value): value is { range: string; values: string[][] } => value !== null);

        if (headerUpdates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: headerUpdates,
                },
            });
        }
    } catch (error) {
        console.error('Error ensuring sheets exist:', error);
        throw error;
    }
}
