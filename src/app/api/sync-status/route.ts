import { NextResponse } from 'next/server';
import { syncEquipmentStatus } from '@/lib/sync-equipment-status';

function parseBooleanQuery(value: string | null): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

async function handleSync(request: Request) {
    try {
        const url = new URL(request.url);
        const dryRun = parseBooleanQuery(url.searchParams.get('dryRun'));
        const forceUpdateAll = parseBooleanQuery(url.searchParams.get('forceUpdateAll'));
        const result = await syncEquipmentStatus({ dryRun, forceUpdateAll });

        return NextResponse.json({
            success: true,
            message: dryRun
                ? `Dry-run selesai! ${result.updated} alat akan di-update.`
                : `${forceUpdateAll ? 'Force sync' : 'Sync'} selesai! ${result.updated} alat di-update.`,
            dryRun: result.dryRun,
            stats: result.stats,
            updated: result.updated,
            unchanged: result.unchanged,
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error syncing status:', error);
        return NextResponse.json(
            { error: 'Failed to sync status', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    return handleSync(request);
}

export async function POST(request: Request) {
    return handleSync(request);
}
