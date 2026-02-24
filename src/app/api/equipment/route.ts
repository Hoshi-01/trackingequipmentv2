import { NextResponse } from 'next/server';
import { getAllEquipment, addEquipment, ensureSheetsExist, normalizePriority } from '@/lib/google-sheets';
import { syncEquipmentStatus } from '@/lib/sync-equipment-status';

const AUTO_SYNC_INTERVAL_MS = 8_000;
let lastAutoSyncAt = 0;
let autoSyncInFlight: Promise<void> | null = null;

function parseBooleanQuery(value: string | null): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

async function maybeAutoSyncEquipmentStatus(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - lastAutoSyncAt < AUTO_SYNC_INTERVAL_MS) return;

    if (!autoSyncInFlight) {
        autoSyncInFlight = (async () => {
            try {
                await syncEquipmentStatus();
                lastAutoSyncAt = Date.now();
            } catch (error) {
                // Keep equipment API available even if sync fails.
                console.error('Auto-sync before equipment fetch failed:', error);
            } finally {
                autoSyncInFlight = null;
            }
        })();
    }

    await autoSyncInFlight;
}

// GET - Return equipment directly from MASTER ALAT
// Status is already synced by force-sync API, no need to recalculate
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const forceSync = parseBooleanQuery(url.searchParams.get('sync'));

        await ensureSheetsExist();
        await maybeAutoSyncEquipmentStatus(forceSync);

        const equipment = await getAllEquipment();

        return NextResponse.json({
            equipment,
            total: equipment.length,
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch equipment' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.nama || !body.merk || !body.tipe) {
            return NextResponse.json(
                { error: 'Missing required fields: nama, merk, tipe' },
                { status: 400 }
            );
        }

        await addEquipment({
            nama: body.nama,
            merk: body.merk,
            tipe: body.tipe,
            noSeri: body.noSeri || '-',
            status: body.status || 'available',
            prioritas: normalizePriority(body.prioritas),
            lokasi: body.lokasi || 'Gudang',
            peminjam: body.peminjam || '-',
            kondisi: body.kondisi || 'Aktif',
            keterangan: body.keterangan || '',
            kalibrasiTerakhir: body.kalibrasiTerakhir || '',
            intervalKalibrasiBulan: body.intervalKalibrasiBulan,
            kalibrasiBerikutnya: body.kalibrasiBerikutnya || '',
            noSertifikatKalibrasi: body.noSertifikatKalibrasi || '',
            labKalibrasi: body.labKalibrasi || '',
            biayaKalibrasi: body.biayaKalibrasi || '',
            urlSertifikatKalibrasi: body.urlSertifikatKalibrasi || '',
        });

        return NextResponse.json({ success: true, message: 'Equipment added successfully' });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to add equipment' },
            { status: 500 }
        );
    }
}
