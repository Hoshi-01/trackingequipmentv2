import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.SMOKE_PORT || '3010');
const BASE = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopServer(proc) {
  if (!proc || proc.killed) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // Ignore stop errors.
  }
}

async function waitForServerReady(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/`);
      if (response.status === 200) return;
    } catch {
      // Keep polling until timeout.
    }
    await sleep(1000);
  }
  throw new Error(`Server tidak siap pada ${BASE}`);
}

function addResult(results, type, target, status, check) {
  results.push({ type, target, status, check });
}

function printResults(results) {
  const rows = [['TYPE', 'TARGET', 'STATUS', 'CHECK'], ...results.map((item) => [item.type, item.target, String(item.status), item.check])];
  const widths = [0, 0, 0, 0];

  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], String(cell).length);
    });
  }

  const line = (row) => row.map((cell, index) => String(cell).padEnd(widths[index])).join(' | ');
  const divider = widths.map((width) => '-'.repeat(width)).join('-+-');

  console.log(line(rows[0]));
  console.log(divider);
  for (let index = 1; index < rows.length; index += 1) {
    console.log(line(rows[index]));
  }
}

async function run() {
  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(nextBin)) {
    throw new Error('Next.js binary tidak ditemukan. Jalankan `npm ci` terlebih dahulu.');
  }

  const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  const results = [];

  try {
    await waitForServerReady();

    const pages = [
      ['/', 'Pusat Kontrol Alat'],
      ['/equipment', 'Daftar Alat'],
      ['/history', 'History Log'],
      ['/reports', 'Laporan Status Alat'],
      ['/calibration', 'Jadwal Rekalibrasi Alat'],
      ['/qrcode', 'QR Code Generator'],
      ['/admin', 'Admin Login'],
    ];

    for (const [routePath, textNeedle] of pages) {
      const response = await fetch(`${BASE}${routePath}`);
      const body = await response.text();
      const ok = response.status === 200 && body.includes(textNeedle);
      addResult(results, 'PAGE', routePath, response.status, ok ? 'OK' : `Missing text: ${textNeedle}`);
    }

    const historyResponse = await fetch(`${BASE}/api/history`);
    const historyData = await historyResponse.json();
    addResult(
      results,
      'API',
      '/api/history',
      historyResponse.status,
      Array.isArray(historyData.history) && typeof historyData.total !== 'undefined'
        ? `OK (${historyData.total} rows)`
        : 'Invalid response shape'
    );

    const equipmentResponse = await fetch(`${BASE}/api/equipment?sync=1`);
    const equipmentData = await equipmentResponse.json();
    const equipmentList = Array.isArray(equipmentData.equipment) ? equipmentData.equipment : [];
    addResult(
      results,
      'API',
      '/api/equipment?sync=1',
      equipmentResponse.status,
      equipmentList.length > 0 && Object.prototype.hasOwnProperty.call(equipmentList[0], 'kalibrasiBerikutnya')
        ? `OK (${equipmentList.length} items)`
        : 'Invalid equipment response or empty data'
    );

    const syncResponse = await fetch(`${BASE}/api/sync-status?dryRun=1`);
    const syncData = await syncResponse.json();
    addResult(
      results,
      'API',
      '/api/sync-status?dryRun=1',
      syncResponse.status,
      syncData?.success === true &&
        syncData?.stats &&
        Object.prototype.hasOwnProperty.call(syncData.stats, 'invalidActionRecords')
        ? `OK (invalidActionRecords=${syncData.stats.invalidActionRecords})`
        : 'Invalid sync dry-run response'
    );

    const compareResponse = await fetch(`${BASE}/api/compare-reads`);
    const compareData = await compareResponse.json();
    addResult(
      results,
      'API',
      '/api/compare-reads',
      compareResponse.status,
      compareData?.fullRead && compareData?.eOnlyRead ? 'OK' : 'Invalid compare response'
    );

    if (equipmentList.length > 0) {
      const firstId = equipmentList[0].id;
      const singleResponse = await fetch(`${BASE}/api/equipment/${firstId}`);
      const singleData = await singleResponse.json();
      addResult(
        results,
        'API',
        `/api/equipment/${firstId}`,
        singleResponse.status,
        singleData?.equipment?.id === String(firstId) ? 'OK' : 'Invalid item response'
      );

      const invalidPriorityResponse = await fetch(`${BASE}/api/equipment/${firstId}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritas: 'INVALID' }),
      });
      addResult(
        results,
        'API',
        `/api/equipment/${firstId}/priority (invalid payload)`,
        invalidPriorityResponse.status,
        invalidPriorityResponse.status === 400 ? 'OK (validation works)' : 'Expected 400 validation error'
      );
    }

    const loginResponse = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password-smoke-test' }),
    });
    addResult(
      results,
      'API',
      '/api/admin/login (wrong password)',
      loginResponse.status,
      loginResponse.status === 401 ? 'OK (auth guard works)' : 'Expected 401'
    );

    const excelResponse = await fetch(`${BASE}/api/generate-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ nama: 'SMOKE TEST', merk: 'TEST', tipe: 'TEST', noSeri: 'SMOKE-001', tanggalKembali: null }],
      }),
    });
    const excelContentType = excelResponse.headers.get('content-type') || '';
    addResult(
      results,
      'API',
      '/api/generate-excel',
      excelResponse.status,
      excelResponse.status === 200 && excelContentType.includes('spreadsheetml')
        ? 'OK (xlsx generated)'
        : `Unexpected response (${excelContentType})`
    );

    printResults(results);

    const failed = results.filter((item) => !String(item.check).startsWith('OK'));
    if (failed.length > 0) {
      throw new Error(`Smoke test gagal pada: ${failed.map((item) => item.target).join(', ')}`);
    }

    console.log('SMOKE_TEST_RESULT: PASS');
  } finally {
    stopServer(server);
  }
}

run().catch((error) => {
  console.error('SMOKE_TEST_RESULT: FAIL');
  console.error(error?.stack || String(error));
  process.exit(1);
});
