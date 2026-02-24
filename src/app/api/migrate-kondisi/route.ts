import { NextResponse } from 'next/server';
import { google } from 'googleapis';

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

// One-time migration to add KONDISI and KETERANGAN columns
export async function POST() {
    try {
        // 1. First, add headers to row 1 columns I and J
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!I1:J1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['KONDISI', 'KETERANGAN']],
            },
        });

        // 2. Get current data to know how many rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!A2:H",
        });

        const rows = response.data.values || [];
        const rowCount = rows.length;

        if (rowCount > 0) {
            // 3. Fill all rows with 'Aktif' and empty keterangan
            const kondisiData = rows.map(() => ['Aktif', '']);

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'MASTER ALAT'!I2:J${rowCount + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: kondisiData,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil menambahkan kolom KONDISI dan KETERANGAN untuk ${rowCount} alat`,
            rowsUpdated: rowCount,
        });

    } catch (error) {
        console.error('Error migrating spreadsheet:', error);
        return NextResponse.json(
            { error: 'Failed to migrate spreadsheet', details: String(error) },
            { status: 500 }
        );
    }
}
