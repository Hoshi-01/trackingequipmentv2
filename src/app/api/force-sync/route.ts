import { NextResponse } from 'next/server';
import { syncEquipmentStatus } from '@/lib/sync-equipment-status';

export async function POST() {
    try {
        const result = await syncEquipmentStatus({ forceUpdateAll: true });

        return NextResponse.json({
            success: true,
            message: `Force sync selesai! ${result.updated} alat di-update.`,
            stats: result.stats,
            updated: result.updated,
            unchanged: result.unchanged,
        });

    } catch (error) {
        console.error('Error force syncing:', error);
        return NextResponse.json(
            { error: 'Failed to force sync', details: String(error) },
            { status: 500 }
        );
    }
}
