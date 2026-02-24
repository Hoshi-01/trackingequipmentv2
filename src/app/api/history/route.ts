import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/google-sheets';

function parseHistoryTimestamp(ts: string): Date {
    const raw = (ts || '').trim();
    if (!raw) return new Date(0);

    const idFormat = raw.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );

    if (idFormat) {
        const day = Number(idFormat[1]);
        const month = Number(idFormat[2]);
        const year = Number(idFormat[3]) < 100 ? 2000 + Number(idFormat[3]) : Number(idFormat[3]);
        const hour = Number(idFormat[4] || 0);
        const minute = Number(idFormat[5] || 0);
        const second = Number(idFormat[6] || 0);
        const date = new Date(year, month - 1, day, hour, minute, second);

        if (!Number.isNaN(date.getTime())) return date;
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) return fallback;

    return new Date(0);
}

export async function GET() {
    try {
        const history = await getHistory();

        // Sort by timestamp (newest first)
        const sorted = history.sort((a, b) => {
            const dateA = parseHistoryTimestamp(a.timestamp);
            const dateB = parseHistoryTimestamp(b.timestamp);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
            history: sorted,
            total: sorted.length,
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
