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

// Full equipment data from excel_as_json.txt
const EQUIPMENT_DATA = [
    { nama: "Altimeter", merk: "Noname", tipe: "-", noSeri: "Alt TES 001" },
    { nama: "Anak timbangan Analitik", merk: "Noname", tipe: "-", noSeri: "TA TES 001" },
    { nama: "Anak timbangan Obat", merk: "Noname", tipe: "-", noSeri: "1909924" },
    { nama: "Anak Timbang", merk: "-", tipe: "20kg", noSeri: "AT-20KG-001" },
    { nama: "Anak Timbang", merk: "-", tipe: "20kg", noSeri: "AT-20KG-002" },
    { nama: "Anak Timbang", merk: "-", tipe: "20kg", noSeri: "AT-20KG-003" },
    { nama: "Anak Timbang", merk: "-", tipe: "20kg", noSeri: "AT-20KG-004" },
    { nama: "Anak Timbang", merk: "-", tipe: "10kg", noSeri: "AT-10KG-001" },
    { nama: "Anak Timbang", merk: "-", tipe: "5kg", noSeri: "AT-5KG-001" },
    { nama: "Anak Timbang", merk: "-", tipe: "5kg", noSeri: "AT-5KG-002" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-001" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-002" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-003" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-004" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-005" },
    { nama: "Anak Timbang", merk: "F1", tipe: "10kg", noSeri: "1910050" },
    { nama: "Anak Timbang", merk: "F1", tipe: "2kg", noSeri: "1915821" },
    { nama: "Anak Timbang", merk: "F1", tipe: "2kg", noSeri: "1915820" },
    { nama: "Anak Timbang", merk: "F1", tipe: "2kg", noSeri: "1915819" },
    { nama: "Anak Timbang", merk: "F1", tipe: "2kg", noSeri: "1915818" },
    { nama: "Anak Timbang", merk: "F1", tipe: "1kg", noSeri: "1915434" },
    { nama: "Anak Timbang", merk: "F1", tipe: "1kg", noSeri: "1915816" },
    { nama: "Anak Timbang", merk: "-", tipe: "20kg", noSeri: "AT-20KG-005" },
    { nama: "Anak Timbang", merk: "-", tipe: "2kg", noSeri: "AT-2KG-006" },
    { nama: "Anak Timbang", merk: "-", tipe: "10kg", noSeri: "AT-10KG-002" },
    { nama: "Analytical Balance", merk: "Newtech", tipe: "NT-A1000", noSeri: "2022031002005" },
    { nama: "Analytical Balance", merk: "Labtronic", tipe: "GH214", noSeri: "AB/TES/001" },
    { nama: "Anesthetic Agent Analyzer", merk: "BC biomedical", tipe: "AA-8000", noSeri: "73601338" },
    { nama: "Autoclave", merk: "Madgetech", tipe: "HI TEMP 140", noSeri: "AC-001" },
    { nama: "Colimator Test Tool", merk: "-", tipe: "-", noSeri: "CTT-001" },
    { nama: "Defibrilator Analyzer", merk: "Nevada", tipe: "Impulse 3000", noSeri: "3845" },
    { nama: "Defibrilator Analyzer", merk: "Nevada", tipe: "Impulse 3000", noSeri: "3749" },
    { nama: "Defibrilator Analyzer", merk: "BIOTEK", tipe: "QED6", noSeri: "96933" },
    { nama: "Digital Anemometer", merk: "Benetech", tipe: "GM816", noSeri: "CR2032" },
    { nama: "Digital Microscope", merk: "Rohs", tipe: "X4", noSeri: "DM/TES/001" },
    { nama: "Digital Pressure Analyzer", merk: "SNDWAY", tipe: "SW-512C", noSeri: "21F089523" },
    { nama: "Digital Pressure Gauge", merk: "Tire Pressure", tipe: "-", noSeri: "DPG TES 001" },
    { nama: "Digital Pressure Meter", merk: "SNDWAY", tipe: "SW-512C", noSeri: "220034008" },
    { nama: "Digital Pressure Meter", merk: "Fluke", tipe: "DPM4 1G", noSeri: "3636009TES" },
    { nama: "Digital Pressure Meter", merk: "SNDWAY", tipe: "SW-512C", noSeri: "240112406" },
    { nama: "Digital Thermometer", merk: "Noname", tipe: "TP-300", noSeri: "DT TES 001" },
    { nama: "ECG Simulator", merk: "Contec", tipe: "MS400", noSeri: "2109020001" },
    { nama: "EEG Simulator", merk: "Newtech", tipe: "Minisim EEG", noSeri: "38140" },
    { nama: "Electrical Safety Analyzer", merk: "Fluke", tipe: "ESA 609", noSeri: "363009TES" },
    { nama: "Electrical Safety Analyzer", merk: "Biotek", tipe: "505Pro", noSeri: "122861" },
    { nama: "Electrical Safety Analyzer", merk: "Biotek", tipe: "505Pro", noSeri: "130195" },
    { nama: "Electrical Safety Analyzer", merk: "Fluke", tipe: "ESA 620", noSeri: "1183014" },
    { nama: "ESU Analyzer", merk: "Nevada", tipe: "4544", noSeri: "775" },
    { nama: "ESU Analyzer", merk: "Metron", tipe: "QAES - ED", noSeri: "5603" },
    { nama: "ESU Analyzer", merk: "Fluke", tipe: "RF303", noSeri: "1805058" },
    { nama: "ESU Analyzer", merk: "Nevada", tipe: "454H", noSeri: "984" },
    { nama: "Fetal Dopler Simulator", merk: "Naully", tipe: "FDS2001", noSeri: "K04-202103010" },
    { nama: "Fetal Dopler Simulator", merk: "SKX", tipe: "SKX3000", noSeri: "30B21101401" },
    { nama: "Flow Analyzer", merk: "BC Biomedical", tipe: "PFC 3000", noSeri: "BA200250" },
    { nama: "Flow Analyzer", merk: "IMT Medical", tipe: "PF-300", noSeri: "BA102266" },
    { nama: "Incu Analyzer", merk: "Naully", tipe: "IK0211", noSeri: "K03-210402002" },
    { nama: "Incu Analyzer", merk: "Rifftech", tipe: "-", noSeri: "IA TES 001" },
    { nama: "Infusion Device Analyzer", merk: "Fluke", tipe: "IDA4", noSeri: "13348" },
    { nama: "Infusion Device Analyzer", merk: "Fluke", tipe: "IDA 4", noSeri: "10953" },
    { nama: "Infusion Device Analyzer", merk: "Fluke", tipe: "IDA 1S", noSeri: "4751752" },
    { nama: "Infusion Device Analyzer", merk: "Biotek", tipe: "IDA 4", noSeri: "10597" },
    { nama: "Infusion Device Analyzer", merk: "BIOTEK", tipe: "IDA 4", noSeri: "10627" },
    { nama: "LoopMeter (Kaca Pembesar)", merk: "Hand Hold Magnifier", tipe: "MG6B-3", noSeri: "LM/TES/001" },
    { nama: "Luxmeter", merk: "HTI", tipe: "LX-1330B", noSeri: "T546848" },
    { nama: "Luxmeter", merk: "Lutron", tipe: "LX-105", noSeri: "R045614" },
    { nama: "Luxmeter", merk: "-", tipe: "PM-6612", noSeri: "M12EJ19526" },
    { nama: "Manometer", merk: "Lutron", tipe: "PM-9100", noSeri: "I472219" },
    { nama: "Microscope", merk: "Kuning", tipe: "-", noSeri: "MC-001" },
    { nama: "Micropipet", merk: "Thermo Scientific", tipe: "Finnpipette", noSeri: "RH46426" },
    { nama: "Micropipet", merk: "Thermo Scientific", tipe: "Finnpipette", noSeri: "SZ26238" },
    { nama: "Micropipet", merk: "Thermo Scientific", tipe: "Finnpipette", noSeri: "TZ39295" },
    { nama: "Micropipet", merk: "Thermo Scientific", tipe: "Finnpipette", noSeri: "KH30519" },
    { nama: "Micropipet", merk: "Thermo Scientific", tipe: "Finnpipette", noSeri: "KH18210" },
    { nama: "Microscope", merk: "Putih", tipe: "-", noSeri: "MCP TES 001" },
    { nama: "Microtom", merk: "Kotak Hijau", tipe: "-", noSeri: "MCTM/TES/001" },
    { nama: "Newton Meter", merk: "EUS", tipe: "-", noSeri: "NM-001" },
    { nama: "NIBP Simulator", merk: "Contec", tipe: "MS200", noSeri: "23020400019" },
    { nama: "NIBP Simulator", merk: "Contec", tipe: "MS200", noSeri: "21100100009" },
    { nama: "Optical Power Meter", merk: "Joinwit", tipe: "JW3208", noSeri: "OPM24061366C" },
    { nama: "Oxygen Analyzer", merk: "Longfian Scitech", tipe: "Jay-120", noSeri: "MZSC20230306" },
    { nama: "Oxygen Analyzer", merk: "Longfian Scitech", tipe: "Jay-120", noSeri: "MZSC20220018" },
    { nama: "Oxygen Analyzer", merk: "Longfian Scitech", tipe: "Jay 120", noSeri: "MZSC20211198" },
    { nama: "Particle Counter", merk: "Noname", tipe: "-", noSeri: "PCT TES 001" },
    { nama: "Patient Monitor Simulator", merk: "Fluke Biomedical", tipe: "Prosim 4", noSeri: "PMS-001" },
    { nama: "Phototerapy Meter", merk: "Hopocolor", tipe: "HPL-220PAR", noSeri: "222109235" },
    { nama: "Phototerapy Meter", merk: "Hopocolor", tipe: "HPL 220PAR", noSeri: "222208183" },
    { nama: "Printer QR Code", merk: "Zebra", tipe: "-", noSeri: "ZD23042" },
    { nama: "Printer Stiker", merk: "Brother", tipe: "P710BT", noSeri: "P710BT7680" },
    { nama: "Printer Stiker", merk: "Brother", tipe: "P710BT", noSeri: "P710BT8332" },
    { nama: "Resistor Variable (Tens)", merk: "-", tipe: "-", noSeri: "RV-001" },
    { nama: "Sound Level Meter", merk: "Benetech", tipe: "GM1531", noSeri: "2545912" },
    { nama: "Sound Level Meter", merk: "HTI", tipe: "HTI-80A", noSeri: "201910010919" },
    { nama: "Sound Level Calibrator", merk: "Lutron", tipe: "SC-934", noSeri: "I.562097" },
    { nama: "Spectrum Tester", merk: "Duotone Cloud", tipe: "HP330", noSeri: "892410494" },
    { nama: "Spirometer", merk: "Hans Rudolph", tipe: "5570", noSeri: "557-57710" },
    { nama: "Spirometer", merk: "Hans Rudolph", tipe: "5570", noSeri: "557-58409" },
    { nama: "SPO2 Simulator", merk: "Contec", tipe: "MS 100", noSeri: "21110100006" },
    { nama: "Stature Meter", merk: "Noname", tipe: "-", noSeri: "SM TES 001" },
    { nama: "Stopwatch", merk: "Seiko", tipe: "5056-4000", noSeri: "21481" },
    { nama: "Stopwatch", merk: "Seiko", tipe: "5056-4000", noSeri: "1D2921" },
    { nama: "Stopwatch", merk: "Taf Sport", tipe: "-", noSeri: "SW-003" },
    { nama: "Tachometer", merk: "Sanfix", tipe: "DT-2236C", noSeri: "S202398" },
    { nama: "Tachometer", merk: "Sanfix", tipe: "DT-2236C", noSeri: "S256455" },
    { nama: "Tachometer", merk: "Digital Tacho", tipe: "DT-2234+", noSeri: "S395292" },
    { nama: "Tachometer", merk: "Digital Tacho", tipe: "DT-2234+", noSeri: "S316984" },
    { nama: "Tachometer Dental Unit", merk: "Handpiece Tachometer", tipe: "-", noSeri: "TDU/TES/001" },
    { nama: "Tang Ampere Meter", merk: "Prova 15", tipe: "-", noSeri: "21100974" },
    { nama: "Temperature Datalogger", merk: "Madgetech", tipe: "Hitemp 140", noSeri: "Au002" },
    { nama: "TENS Simulator", merk: "Siglent", tipe: "SDS", noSeri: "1162842" },
    { nama: "Thermocouple 4 Ch", merk: "Lutron", tipe: "TM 946", noSeri: "1466043" },
    { nama: "Thermocouple 4Ch", merk: "Hti", tipe: "HT-9815", noSeri: "2022030018188" },
    { nama: "Thermocouple 4Ch", merk: "HTI", tipe: "HT-9815", noSeri: "HDJA000007832" },
    { nama: "Thermocouple 16ch", merk: "A-BF", tipe: "BCL3016P", noSeri: "202305100" },
    { nama: "Thermohygro", merk: "HTC", tipe: "HTC-1", noSeri: "001 L1" },
    { nama: "Thermohygro", merk: "HTC", tipe: "HTC-1", noSeri: "002 L1" },
    { nama: "Thermohygrometer", merk: "HTC", tipe: "HTC-1", noSeri: "THM-001" },
    { nama: "Thermohygrometer", merk: "HTC", tipe: "HTC-1", noSeri: "THM-002" },
    { nama: "Tonometer", merk: "Raish", tipe: "2UYA", noSeri: "TNM TES 001" },
    { nama: "Traksi", merk: "Hasmen", tipe: "817", noSeri: "TK TES 001" },
    { nama: "Traksi Simulator", merk: "Camry", tipe: "EH101", noSeri: "Trk TES 001" },
    { nama: "USG Phantom", merk: "Gamex", tipe: "SONO 404", noSeri: "802261-4738-4" },
    { nama: "USG Phantom", merk: "Lokal", tipe: "-", noSeri: "USG-002" },
    { nama: "UST Analyzer", merk: "BC Biomedical", tipe: "USP-100A", noSeri: "UST-001" },
    { nama: "UVC Meter", merk: "Lutron", tipe: "SP-82W", noSeri: "871608" },
    { nama: "UVC Meter", merk: "UVC", tipe: "RGM-UVC", noSeri: "M20200611116" },
    { nama: "Waterbath", merk: "JoanLab", tipe: "WB100-1", noSeri: "601020220819157" },
    { nama: "Waterbath", merk: "Magket", tipe: "DWB1H", noSeri: "2023012260335" },
    { nama: "Waterbath Transparan", merk: "Faithful", tipe: "DK-98-IV", noSeri: "20200107002" },
    { nama: "Waterpass", merk: "Fixta Laser", tipe: "LevelPro 3", noSeri: "30333590.4" },
    { nama: "X ray Simulator", merk: "ECC", tipe: "UXI", noSeri: "295" },
    { nama: "X ray Simulator", merk: "ECC", tipe: "UXI", noSeri: "351" },
    { nama: "Laser Kalibrator", merk: "Ophir", tipe: "-", noSeri: "LK-001" },
    { nama: "SPO2 Simulator", merk: "Contec", tipe: "MS100", noSeri: "25080400018" },
    { nama: "SPO2 Simulator", merk: "Contec", tipe: "MS100", noSeri: "25080400013" },
    { nama: "NIBP Simulator", merk: "Contec", tipe: "MS200", noSeri: "25090100006" },
    { nama: "Fetal Doppler Simulator", merk: "Jegges", tipe: "FTALSim-01", noSeri: "009" },
    { nama: "Phantom MRI", merk: "-", tipe: "-", noSeri: "MRI-001" },
    { nama: "Phantom MRI", merk: "-", tipe: "-", noSeri: "MRI-002" },
    { nama: "Ultrasound Wattmeter", merk: "Fluke", tipe: "UW5", noSeri: "50033" },
    { nama: "Datalogger Auto", merk: "Az Instrument", tipe: "88170", noSeri: "DL-001" },
    { nama: "Particle Counter", merk: "HTI", tipe: "HT-9600", noSeri: "HDIC000039608" },
    { nama: "Hot Wire Anemometer", merk: "Benetech", tipe: "GM8903", noSeri: "NJ:3151330" },
];

export async function POST() {
    try {
        // Check if sheet exists, if not create it
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

        if (!existingSheets.includes('MASTER ALAT')) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'MASTER ALAT' } },
                    }],
                },
            });

            // Add headers
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'MASTER ALAT'!A1:R1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        'Nama',
                        'Merk',
                        'Tipe',
                        'NoSeri',
                        'Status',
                        'Lokasi',
                        'Peminjam',
                        'LastUpdate',
                        'KONDISI',
                        'KETERANGAN',
                        'PRIORITAS',
                        'KALIBRASI_TERAKHIR',
                        'INTERVAL_KALIBRASI_BULAN',
                        'KALIBRASI_BERIKUTNYA',
                        'NO_SERTIFIKAT',
                        'LAB_KALIBRASI',
                        'BIAYA_KALIBRASI',
                        'URL_SERTIFIKAT',
                    ]],
                },
            });
        }

        // Clear existing data (keep header)
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: `'MASTER ALAT'!A2:R1000`,
        });

        // Insert equipment data
        const rows = EQUIPMENT_DATA.map(eq => [
            eq.nama,
            eq.merk,
            eq.tipe,
            eq.noSeri,
            'available',
            'Gudang',
            '-',
            new Date().toISOString(),
            'Aktif',
            '',
            'NONE',
            '',
            12,
            '',
            '',
            '',
            '',
            '',
        ]);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'MASTER ALAT'!A2:R`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
        });

        return NextResponse.json({
            success: true,
            message: `Imported ${EQUIPMENT_DATA.length} items`,
            count: EQUIPMENT_DATA.length,
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({
            success: false,
            error: String(error)
        }, { status: 500 });
    }
}
