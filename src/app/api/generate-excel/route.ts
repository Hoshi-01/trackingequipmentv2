import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';

export async function POST(request: Request) {
    try {
        // Parse request body
        const body = await request.json();
        console.log('Received body keys:', Object.keys(body));

        const records = body?.records;

        // Validate records
        if (!records || !Array.isArray(records)) {
            console.error('Invalid records:', typeof records);
            return NextResponse.json({
                error: 'Data records tidak valid'
            }, { status: 400 });
        }

        if (records.length === 0) {
            return NextResponse.json({
                error: 'Tidak ada data peminjaman untuk di-export'
            }, { status: 400 });
        }

        // Check template exists
        const templatePath = path.join(process.cwd(), 'public', 'templates', 'form-peminjaman-resmi.xlsx');

        if (!fs.existsSync(templatePath)) {
            console.error('Template not found at:', templatePath);
            return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
        }

        // Dynamic import xlsx-populate
        const XlsxPopulate = (await import('xlsx-populate')).default;

        // Load workbook from template file
        console.log('Loading template...');
        const workbook = await XlsxPopulate.fromFileAsync(templatePath);

        // Get sheet "DPM (2)" which is the active template
        const sheet = workbook.sheet('DPM (2)');
        console.log('Sheet name:', sheet.name());

        if (!sheet) {
            return NextResponse.json({ error: 'Worksheet tidak ditemukan' }, { status: 500 });
        }

        console.log('Processing', records.length, 'records');

        // Data starts at row 18 (verified: row 17 is header)
        const startRow = 18;

        for (let index = 0; index < records.length; index++) {
            const record = records[index];
            const rowNum = startRow + index;

            // Fill peminjaman data to correct cells
            sheet.cell('B' + rowNum).value(index + 1);               // No
            sheet.cell('C' + rowNum).value(record.nama || '');       // Nama Alat
            sheet.cell('D' + rowNum).value(record.merk || '');       // Merek
            sheet.cell('E' + rowNum).value(record.tipe || '');       // Tipe
            sheet.cell('F' + rowNum).value(record.noSeri || '');     // No. Seri
            sheet.cell('G' + rowNum).value('Lengkap');               // Kelengkapan
            sheet.cell('H' + rowNum).value(1);                       // Jumlah
            sheet.cell('I' + rowNum).value('Baik');                  // Kondisi

            // Pengembalian (kosong jika belum kembali)
            if (record.tanggalKembali) {
                sheet.cell('J' + rowNum).value(record.tanggalKembali); // Tanggal
                sheet.cell('K' + rowNum).value(1);                     // Jumlah
                sheet.cell('L' + rowNum).value('Baik');                // Kondisi
            }

            if (index < 3) {
                console.log(`Row ${rowNum}: ${record.nama} - verified: ${sheet.cell('C' + rowNum).value()}`);
            }
        }

        console.log('Generating output...');

        // Generate buffer as Uint8Array for proper browser handling
        const buffer = await workbook.outputAsync({ type: 'nodebuffer' });

        // Convert to Uint8Array for NextResponse
        const uint8Array = new Uint8Array(buffer);

        // Return as downloadable file
        const filename = `Form_Peminjaman_${new Date().toISOString().split('T')[0]}.xlsx`;

        console.log('Returning file:', filename, 'Size:', uint8Array.length);

        return new NextResponse(uint8Array, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(uint8Array.length),
            },
        });

    } catch (error) {
        console.error('Error generating Excel:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Stack:', error instanceof Error ? error.stack : '');
        return NextResponse.json({
            error: 'Gagal generate Form: ' + errorMessage
        }, { status: 500 });
    }
}
