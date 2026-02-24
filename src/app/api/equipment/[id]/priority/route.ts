import { NextResponse } from 'next/server';
import { getAllEquipment, type EquipmentPriority, updateEquipment } from '@/lib/google-sheets';

interface RouteParams {
    params: Promise<{ id: string }>;
}

function parseEquipmentId(id: string): number | null {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed;
}

function parsePriorityValue(value: unknown): EquipmentPriority | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim().toUpperCase();
    if (cleaned === 'NONE' || cleaned === 'P1' || cleaned === 'P2' || cleaned === 'P3') {
        return cleaned as EquipmentPriority;
    }
    return null;
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const parsedId = parseEquipmentId(id);
        if (parsedId === null) {
            return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });
        }

        const body = await request.json();
        const nextPriority = parsePriorityValue(body?.prioritas);
        if (nextPriority === null) {
            return NextResponse.json({ error: 'Invalid prioritas value. Allowed: NONE, P1, P2, P3' }, { status: 400 });
        }

        const rowIndex = parsedId - 1;
        const equipment = await getAllEquipment(true);
        const current = equipment[rowIndex];
        if (!current) {
            return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
        }

        if (current.prioritas === nextPriority) {
            return NextResponse.json({
                success: true,
                message: 'Prioritas tidak berubah.',
                prioritas: nextPriority,
            });
        }

        await updateEquipment(rowIndex, { prioritas: nextPriority });

        return NextResponse.json({
            success: true,
            message: `Prioritas berhasil diubah dari ${current.prioritas} ke ${nextPriority}.`,
            before: current.prioritas,
            after: nextPriority,
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to update equipment priority' }, { status: 500 });
    }
}
