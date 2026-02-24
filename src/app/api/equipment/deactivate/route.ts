import { NextResponse } from 'next/server';
import { deactivateEquipment, getAllEquipment } from '@/lib/google-sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const rawRowIndex = body?.rowIndex;
        const { keterangan } = body;

        const rowIndex =
            typeof rawRowIndex === 'number' ? rawRowIndex : Number(rawRowIndex);

        if (!Number.isInteger(rowIndex) || rowIndex < 0) {
            return NextResponse.json(
                { error: 'Invalid rowIndex' },
                { status: 400 }
            );
        }

        const equipment = await getAllEquipment(true);
        if (rowIndex >= equipment.length) {
            return NextResponse.json(
                { error: 'Equipment not found' },
                { status: 404 }
            );
        }

        await deactivateEquipment(rowIndex, keterangan || `Dinonaktifkan pada ${new Date().toLocaleDateString('id-ID')}`);

        return NextResponse.json({
            success: true,
            message: 'Alat berhasil dinonaktifkan',
        });
    } catch (error) {
        console.error('Error deactivating equipment:', error);
        return NextResponse.json(
            { error: 'Failed to deactivate equipment', details: String(error) },
            { status: 500 }
        );
    }
}
