import { NextResponse } from 'next/server';
import { updateEquipment, deleteEquipment, getAllEquipment, addHistory } from '@/lib/google-sheets';

interface RouteParams {
    params: Promise<{ id: string }>;
}

function parseEquipmentId(id: string): number | null {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return null;
    }
    return parsed;
}

export async function GET(
    request: Request,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const parsedId = parseEquipmentId(id);
        if (parsedId === null) {
            return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });
        }

        // IMPORTANT: Use includeInactive=true to get correct row index mapping
        const equipment = await getAllEquipment(true);
        const item = equipment[parsedId - 1];

        if (!item) {
            return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
        }

        return NextResponse.json({ equipment: item });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const parsedId = parseEquipmentId(id);
        if (parsedId === null) {
            return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });
        }

        const body = await request.json();
        const rowIndex = parsedId - 1;

        // IMPORTANT: Use includeInactive=true to get correct row index mapping
        const equipment = await getAllEquipment(true);
        const currentItem = equipment[rowIndex];
        if (!currentItem) {
            return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
        }

        // If status is changing to available (return action)
        if (body.status === 'available' && currentItem.status === 'borrowed') {
            // Log to history
            await addHistory({
                nama: currentItem.nama,
                merk: currentItem.merk,
                tipe: currentItem.tipe,
                noSeri: currentItem.noSeri,
                aksi: 'Pengembalian',
                teknisi: body.adminUser || 'ADMIN', // Use provided admin user or default to 'ADMIN'
                lokasi: 'Gudang',
                catatan: 'Pengembalian via Admin Panel',
            });
        }

        await updateEquipment(rowIndex, body);

        return NextResponse.json({ success: true, message: 'Equipment updated successfully' });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const parsedId = parseEquipmentId(id);
        if (parsedId === null) {
            return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });
        }

        const rowIndex = parsedId - 1;
        const equipment = await getAllEquipment(true);
        if (!equipment[rowIndex]) {
            return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
        }

        await deleteEquipment(rowIndex);

        return NextResponse.json({ success: true, message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
    }
}
