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

// Test direct read from MASTER ALAT
export async function GET() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!A2:H10", // First 9 rows
        });

        const rows = response.data.values || [];
        const sample = rows.map((row, i) => ({
            row: i + 2,
            nama: row[0],
            noSeri: row[3],
            status: row[4],
            lokasi: row[5],
            lastUpdate: row[7],
        }));

        const allResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!E2:E",
        });

        const allStatuses = (allResponse.data.values || []).map(r => r[0]);
        const availableCount = allStatuses.filter(s => s?.toLowerCase() === 'available').length;
        const borrowedCount = allStatuses.filter(s => s?.toLowerCase() === 'borrowed').length;

        return NextResponse.json({
            sample,
            stats: {
                total: allStatuses.length,
                available: availableCount,
                borrowed: borrowedCount,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
