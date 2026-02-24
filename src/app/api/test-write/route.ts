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

// Test write to a single cell to verify permissions
export async function GET() {
    try {
        // First, read current data
        const readResult = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!A2:H3", // Just first 2 rows
        });

        const currentData = readResult.data.values || [];

        // Try to update status column (E) of first borrowed item
        // Column mapping: A=nama, B=merk, C=tipe, D=noSeri, E=status, F=lokasi, G=peminjam, H=lastUpdate

        // Find first row where status is "borrowed"
        const fullDataResult = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'MASTER ALAT'!A2:H",
        });

        const allRows = fullDataResult.data.values || [];
        const borrowedIndex = allRows.findIndex(row => (row[4] || '').toLowerCase() === 'borrowed');

        if (borrowedIndex === -1) {
            return NextResponse.json({
                message: 'No borrowed items found!',
                currentData,
            });
        }

        const rowNumber = borrowedIndex + 2; // +2 because A1 is header
        const borrowedRow = allRows[borrowedIndex];

        // Update this single row to available
        const testRange = `'MASTER ALAT'!E${rowNumber}:H${rowNumber}`;
        const testValues = [['available', 'Gudang', '-', new Date().toISOString()]];

        const updateResult = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: testRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: testValues },
        });

        return NextResponse.json({
            success: true,
            message: `Updated row ${rowNumber} (${borrowedRow[0]} - ${borrowedRow[3]}) from borrowed to available`,
            testRange,
            updateResponse: {
                spreadsheetId: updateResult.data.spreadsheetId,
                updatedRange: updateResult.data.updatedRange,
                updatedRows: updateResult.data.updatedRows,
                updatedColumns: updateResult.data.updatedColumns,
                updatedCells: updateResult.data.updatedCells,
            },
        });

    } catch (error) {
        console.error('Test write error:', error);
        return NextResponse.json(
            {
                error: 'Failed to test write',
                details: String(error),
                stack: (error as Error).stack,
            },
            { status: 500 }
        );
    }
}
