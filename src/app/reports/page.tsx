'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';
import {
  normalizeNoSeri,
  parseHistoryTimestamp,
  reconcileHistoryEvents,
} from '@/lib/history-reconciliation';

type EquipmentPriority = 'NONE' | 'P1' | 'P2' | 'P3';

interface EquipmentRecord {
  id: string;
  nama: string;
  merk: string;
  tipe: string;
  noSeri: string;
  status: 'available' | 'borrowed' | 'maintenance';
  prioritas: EquipmentPriority;
  lokasi: string;
  peminjam?: string;
  kalibrasiBerikutnya?: string;
}

interface HistoryRecord {
  timestamp: string;
  noSeri: string;
  aksi: 'checkout' | 'checkin';
  teknisi: string;
  lokasi: string;
}

type SortColumn =
  | 'nama'
  | 'noSeri'
  | 'status'
  | 'teknisi'
  | 'lokasi'
  | 'pinjamTerakhir'
  | 'kembaliTerakhir';

interface ReportRow extends EquipmentRecord {
  lastBorrowAt: string;
  lastBorrowMs: number;
  lastBorrowBy: string;
  lastBorrowLocation: string;
  lastReturnAt: string;
  lastReturnMs: number;
  lastReturnBy: string;
}

function getSortLabel(active: boolean, direction: 'asc' | 'desc') {
  if (!active) return '<>';
  return direction === 'asc' ? '^' : 'v';
}

function formatTimestamp(value: string) {
  if (!value) return '-';
  const date = parseHistoryTimestamp(value);
  if (!date.getTime()) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportsPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EquipmentRecord['status']>('borrowed');
  const [sortColumn, setSortColumn] = useState<SortColumn>('pinjamTerakhir');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [equipmentRes, historyRes] = await Promise.all([fetch('/api/equipment?sync=1'), fetch('/api/history')]);
        const equipmentData = await equipmentRes.json();
        const historyData = await historyRes.json();

        if (equipmentData.equipment) setEquipment(equipmentData.equipment);
        if (historyData.history) setHistory(historyData.history);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const reconciliationResult = useMemo(
    () =>
      reconcileHistoryEvents(
        history.map((item, index) => ({
          eventId: `hist-${index + 1}`,
          timestamp: item.timestamp,
          noSeri: item.noSeri,
          aksi: item.aksi,
          teknisi: item.teknisi,
          lokasi: item.lokasi,
        }))
      ),
    [history]
  );

  const historySummaryMap = useMemo(() => {
    const map = new Map<
      string,
      {
        lastBorrowAt: string;
        lastBorrowMs: number;
        lastBorrowBy: string;
        lastBorrowLocation: string;
        lastReturnAt: string;
        lastReturnMs: number;
        lastReturnBy: string;
      }
    >();

    reconciliationResult.events.forEach((event) => {
      if (!event.valid) return;

      const existing = map.get(event.noSeriKey) || {
        lastBorrowAt: '',
        lastBorrowMs: 0,
        lastBorrowBy: '-',
        lastBorrowLocation: '-',
        lastReturnAt: '',
        lastReturnMs: 0,
        lastReturnBy: '-',
      };

      if (event.aksi === 'checkout' && event.timestampMs >= existing.lastBorrowMs) {
        existing.lastBorrowAt = event.timestamp;
        existing.lastBorrowMs = event.timestampMs;
        existing.lastBorrowBy = event.teknisi || '-';
        existing.lastBorrowLocation = event.lokasi || '-';
      }

      if (event.aksi === 'checkin' && event.timestampMs >= existing.lastReturnMs) {
        existing.lastReturnAt = event.timestamp;
        existing.lastReturnMs = event.timestampMs;
        existing.lastReturnBy = event.teknisi || '-';
      }

      map.set(event.noSeriKey, existing);
    });

    return map;
  }, [reconciliationResult.events]);

  const reportRows = useMemo<ReportRow[]>(() => {
    return equipment.map((item) => {
      const noSeriKey = normalizeNoSeri(item.noSeri || '');
      const historySummary = historySummaryMap.get(noSeriKey);

      const lastBorrowMs = historySummary?.lastBorrowMs || 0;
      const lastReturnMs = historySummary?.lastReturnMs || 0;

      return {
        ...item,
        lastBorrowAt: historySummary?.lastBorrowAt || '',
        lastBorrowMs,
        lastBorrowBy: historySummary?.lastBorrowBy || '-',
        lastBorrowLocation: historySummary?.lastBorrowLocation || '-',
        lastReturnAt: historySummary?.lastReturnAt || '',
        lastReturnMs,
        lastReturnBy: historySummary?.lastReturnBy || '-',
      };
    });
  }, [equipment, historySummaryMap]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reportRows.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(q) ||
        item.noSeri.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q) ||
        (item.peminjam || '').toLowerCase().includes(q) ||
        item.lastBorrowBy.toLowerCase().includes(q) ||
        item.lastBorrowLocation.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reportRows, searchQuery, statusFilter]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortColumn) {
        case 'nama':
          aValue = a.nama.toLowerCase();
          bValue = b.nama.toLowerCase();
          break;
        case 'noSeri':
          aValue = a.noSeri.toLowerCase();
          bValue = b.noSeri.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'teknisi':
          aValue = (a.peminjam || '').toLowerCase();
          bValue = (b.peminjam || '').toLowerCase();
          break;
        case 'lokasi':
          aValue = (a.lokasi || '').toLowerCase();
          bValue = (b.lokasi || '').toLowerCase();
          break;
        case 'pinjamTerakhir':
          aValue = a.lastBorrowMs;
          bValue = b.lastBorrowMs;
          break;
        case 'kembaliTerakhir':
          aValue = a.lastReturnMs;
          bValue = b.lastReturnMs;
          break;
        default:
          aValue = a.nama.toLowerCase();
          bValue = b.nama.toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRows, sortColumn, sortDirection]);

  const pagedRows = useMemo(
    () => getPaginatedItems(sortedRows, page, pageSize),
    [sortedRows, page, pageSize]
  );

  useEffect(() => {
    if (pagedRows.page !== page) setPage(pagedRows.page);
  }, [pagedRows.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const stats = useMemo(() => {
    const borrowed = equipment.filter((item) => item.status === 'borrowed').length;
    return {
      total: equipment.length,
      borrowed,
    };
  }, [equipment]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'pinjamTerakhir' || column === 'kembaliTerakhir' ? 'desc' : 'asc');
  };

  const generateForm = async () => {
    setGenerating(true);
    try {
      const borrowedRecords = sortedRows
        .filter((item) => item.status === 'borrowed')
        .map((item) => ({
          nama: item.nama,
          merk: item.merk,
          tipe: item.tipe,
          noSeri: item.noSeri,
          tanggalKembali: null,
        }));

      if (borrowedRecords.length === 0) {
        alert('Tidak ada alat berstatus dipinjam pada filter saat ini.');
        return;
      }

      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: borrowedRecords }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal generate form');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Surat_Jalan_Peminjaman_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating form:', error);
      alert(error instanceof Error ? error.message : 'Gagal generate form');
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = async () => {
    setGenerating(true);
    try {
      const XLSX = await import('xlsx');
      const data: string[][] = [
        [
          'No',
          'Nama Alat',
          'Merk',
          'Tipe',
          'No. Seri',
          'Status Saat Ini',
          'Peminjam Aktif',
          'Lokasi Saat Ini',
          'Pinjam Terakhir',
          'Lokasi Pinjam Terakhir',
          'Kembali Terakhir',
        ],
      ];

      sortedRows.forEach((item, index) => {
        data.push([
          String(index + 1),
          item.nama,
          item.merk,
          item.tipe,
          item.noSeri,
          item.status === 'available' ? 'Tersedia' : item.status === 'borrowed' ? 'Dipinjam' : 'Maintenance',
          item.status === 'borrowed' ? item.peminjam || '-' : '-',
          item.lokasi || '-',
          formatTimestamp(item.lastBorrowAt),
          item.lastBorrowLocation || '-',
          formatTimestamp(item.lastReturnAt),
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 26 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
        { wch: 14 },
        { wch: 20 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Alat');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_Alat_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating excel:', error);
      alert(error instanceof Error ? error.message : 'Gagal generate Excel');
    } finally {
      setGenerating(false);
    }
  };

  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <th onClick={() => handleSort(column)} style={{ cursor: 'pointer' }}>
      {label} {getSortLabel(sortColumn === column, sortDirection)}
    </th>
  );

  return (
    <DashboardLayout>
      <section className="page-hero">
        <div>
          <p className="page-kicker">Reporting Center</p>
          <h1 className="page-title">Laporan Status Alat</h1>
          <p className="page-subtitle">
            Satu tampilan status alat + riwayat pinjam/kembali terakhir supaya user mudah cek sudah kembali atau belum.
          </p>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Total Alat</p>
          <p className="kpi-value">{stats.total}</p>
          <p className="kpi-meta">Sumber: MASTER ALAT</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Dipinjam</p>
          <p className="kpi-value">{stats.borrowed}</p>
          <p className="kpi-meta">Status aktif lapangan</p>
        </article>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama, no seri, peminjam, lokasi, teknisi"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ flex: 1, minWidth: 240, maxWidth: 460 }}
        />
        <select
          className="input-modern"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | EquipmentRecord['status'])}
          style={{ width: 180 }}
        >
          <option value="borrowed">Dipinjam</option>
          <option value="all">Semua status</option>
          <option value="available">Tersedia</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <button className="btn-secondary" onClick={generateExcel} disabled={generating || sortedRows.length === 0}>
          {generating ? 'Processing...' : 'Export Data (.xlsx)'}
        </button>
        <button className="btn-primary" onClick={generateForm} disabled={generating || sortedRows.length === 0}>
          {generating ? 'Processing...' : 'Cetak Surat Jalan (.xlsx)'}
        </button>
      </div>

      <section className="panel">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p style={{ marginTop: 10 }}>Memuat data...</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <SortableHeader column="nama" label="Nama Alat" />
                    <SortableHeader column="noSeri" label="No Seri" />
                    <SortableHeader column="status" label="Status Saat Ini" />
                    <SortableHeader column="teknisi" label="Peminjam Aktif" />
                    <SortableHeader column="lokasi" label="Lokasi Saat Ini" />
                    <SortableHeader column="pinjamTerakhir" label="Pinjam Terakhir" />
                    <th>Lokasi Pinjam Terakhir</th>
                    <SortableHeader column="kembaliTerakhir" label="Kembali Terakhir" />
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Nama Alat">
                        <strong>{item.nama}</strong>
                        <div className="panel-subtitle">{`${item.merk} / ${item.tipe}`}</div>
                      </td>
                      <td className="text-mono" data-label="No Seri">{item.noSeri || '-'}</td>
                      <td data-label="Status Saat Ini">
                        <span className={`badge badge-${item.status}`}>
                          {item.status === 'available' && 'Tersedia'}
                          {item.status === 'borrowed' && 'Dipinjam'}
                          {item.status === 'maintenance' && 'Maintenance'}
                        </span>
                      </td>
                      <td data-label="Peminjam Aktif">{item.status === 'borrowed' ? item.peminjam || '-' : '-'}</td>
                      <td data-label="Lokasi Saat Ini">{item.lokasi || '-'}</td>
                      <td data-label="Pinjam Terakhir">
                        {formatTimestamp(item.lastBorrowAt)}
                        <div className="panel-subtitle">{item.lastBorrowBy || '-'}</div>
                      </td>
                      <td data-label="Lokasi Pinjam Terakhir">{item.lastBorrowLocation || '-'}</td>
                      <td data-label="Kembali Terakhir">
                        {formatTimestamp(item.lastReturnAt)}
                        <div className="panel-subtitle">{item.lastReturnBy || '-'}</div>
                      </td>
                    </tr>
                  ))}
                  {pagedRows.totalItems === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">Tidak ada data yang cocok.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '0 14px 14px' }}>
              <PaginationControls
                page={pagedRows.page}
                totalPages={pagedRows.totalPages}
                totalItems={pagedRows.totalItems}
                startItem={pagedRows.startItem}
                endItem={pagedRows.endItem}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}
