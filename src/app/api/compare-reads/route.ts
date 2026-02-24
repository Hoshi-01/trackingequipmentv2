import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

// Compare A2:I vs E2:E reads
export async function GET() {
    try {
        // Read with A2:I range (like getAllEquipment)
        const fullRead = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!A2:I",
        });

        // Read with E2:E range  
        const eOnly = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!E2:E",
        });

        const fullRows = fullRead.data.values || [];
        const eRows = eOnly.data.values || [];

        // Count from full read (column index 4 = E)
        const fullStatusCounts = { available: 0, borrowed: 0, other: 0 };
        fullRows.forEach(row => {
            const status = (row[4] || '').toLowerCase();
            if (status === 'available') fullStatusCounts.available++;
            else if (status === 'borrowed') fullStatusCounts.borrowed++;
            else fullStatusCounts.other++;
        });

        // Count from E-only read
        const eStatusCounts = { available: 0, borrowed: 0, other: 0 };
        eRows.forEach(row => {
            const status = (row[0] || '').toLowerCase();
            if (status === 'available') eStatusCounts.available++;
            else if (status === 'borrowed') eStatusCounts.borrowed++;
            else eStatusCounts.other++;
        });

        // Sample to show difference
        const sample = fullRows.slice(0, 5).map((row, i) => ({
            rowNum: i + 2,
            fullCol4: row[4],
            eOnlyCol: eRows[i]?.[0],
        }));

        return NextResponse.json({
            fullRead: {
                totalRows: fullRows.length,
                counts: fullStatusCounts,
            },
            eOnlyRead: {
                totalRows: eRows.length,
                counts: eStatusCounts,
            },
            sample,
            message: fullStatusCounts.available === eStatusCounts.available
                ? 'DATA MATCH!'
                : 'DATA MISMATCH - Column E values differ between reads!',
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
