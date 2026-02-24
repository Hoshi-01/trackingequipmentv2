'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';
import { parseHistoryTimestamp } from '@/lib/history-reconciliation';

interface HistoryRecord {
  timestamp: string;
  nama: string;
  merk: string;
  tipe: string;
  noSeri: string;
  aksi: 'checkout' | 'checkin';
  teknisi: string;
  lokasi: string;
  catatan: string;
  isMatched: boolean;
}

interface HistoryViewRow extends HistoryRecord {
  eventId: string;
}

type SortColumn = 'timestamp' | 'nama' | 'noSeri' | 'aksi' | 'teknisi' | 'lokasi';

function formatTimestamp(value: string) {
  const date = parseHistoryTimestamp(value);
  if (!date.getTime()) return value || '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSortLabel(active: boolean, direction: 'asc' | 'desc') {
  if (!active) return '<>';
  return direction === 'asc' ? '^' : 'v';
}

export default function HistoryPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'checkout' | 'checkin'>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [monthFilter, setMonthFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const refreshAccess = () => {
      const loggedIn = localStorage.getItem('adminLoggedIn') === 'true';
      setIsAdminLoggedIn(loggedIn);
      if (!loggedIn) {
        setHistory([]);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'adminLoggedIn') {
        refreshAccess();
      }
    };
    const onAdminAuthChanged = () => refreshAccess();

    refreshAccess();
    window.addEventListener('focus', refreshAccess);
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin-auth-changed', onAdminAuthChanged);

    return () => {
      window.removeEventListener('focus', refreshAccess);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-auth-changed', onAdminAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.history) setHistory(data.history);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdminLoggedIn]);

  const historyRows = useMemo<HistoryViewRow[]>(
    () =>
      history.map((item, index) => ({
      ...item,
      eventId: `log-${index + 1}`,
      })),
    [history]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    historyRows.forEach((item) => {
      const date = parseHistoryTimestamp(item.timestamp);
      if (!date.getTime()) return;
      set.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [historyRows]);

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', {
      month: 'short',
      year: 'numeric',
    });
  };

  const filtered = useMemo(() => {
    const list = historyRows.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.nama.toLowerCase().includes(q) ||
        item.noSeri.toLowerCase().includes(q) ||
        item.teknisi.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q);
      const matchAction = actionFilter === 'all' || item.aksi === actionFilter;

      let matchMonth = true;
      if (monthFilter !== 'all') {
        const date = parseHistoryTimestamp(item.timestamp);
        if (!date.getTime()) matchMonth = false;
        if (date.getTime()) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          matchMonth = key === monthFilter;
        }
      }
      return matchSearch && matchAction && matchMonth;
    });

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortColumn) {
        case 'timestamp':
          valA = parseHistoryTimestamp(a.timestamp).getTime() || 0;
          valB = parseHistoryTimestamp(b.timestamp).getTime() || 0;
          break;
        case 'nama':
          valA = a.nama.toLowerCase();
          valB = b.nama.toLowerCase();
          break;
        case 'noSeri':
          valA = a.noSeri.toLowerCase();
          valB = b.noSeri.toLowerCase();
          break;
        case 'aksi':
          valA = a.aksi;
          valB = b.aksi;
          break;
        case 'teknisi':
          valA = (a.teknisi || '').toLowerCase();
          valB = (b.teknisi || '').toLowerCase();
          break;
        case 'lokasi':
          valA = (a.lokasi || '').toLowerCase();
          valB = (b.lokasi || '').toLowerCase();
          break;
        default:
          valA = parseHistoryTimestamp(a.timestamp).getTime() || 0;
          valB = parseHistoryTimestamp(b.timestamp).getTime() || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [historyRows, searchQuery, actionFilter, monthFilter, sortColumn, sortDirection]);

  const pagedHistory = useMemo(
    () => getPaginatedItems(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    if (pagedHistory.page !== page) setPage(pagedHistory.page);
  }, [pagedHistory.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, actionFilter, monthFilter, pageSize]);

  const stats = useMemo(() => {
    return {
      total: historyRows.length,
      checkout: historyRows.filter((item) => item.aksi === 'checkout').length,
      checkin: historyRows.filter((item) => item.aksi === 'checkin').length,
    };
  }, [historyRows]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'timestamp' ? 'desc' : 'asc');
  };

  const generateExcel = async () => {
    setGenerating(true);
    try {
      const XLSX = await import('xlsx');
      const data: string[][] = [
        ['No', 'Waktu', 'Nama Alat', 'Merk', 'Tipe', 'No. Seri', 'Aksi', 'Teknisi', 'Lokasi', 'Catatan'],
      ];

      filtered.forEach((item, index) => {
        data.push([
          String(index + 1),
          formatTimestamp(item.timestamp),
          item.nama || '-',
          item.merk || '-',
          item.tipe || '-',
          item.noSeri || '-',
          item.aksi === 'checkout' ? 'Peminjaman' : 'Pengembalian',
          item.teknisi || '-',
          item.lokasi || '-',
          item.catatan || '-',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 32 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'History Audit');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `History_Audit_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  if (!isAdminLoggedIn) {
    return (
      <DashboardLayout>
        <section className="page-hero">
          <div>
            <p className="page-kicker">Restricted Access</p>
            <h1 className="page-title">History Log</h1>
            <p className="page-subtitle">
              Halaman ini khusus admin untuk kebutuhan audit.
            </p>
          </div>
        </section>
        <section className="panel" style={{ padding: 20 }}>
          <div className="stack">
            <p className="panel-subtitle">
              Silakan login ke Admin Panel untuk melihat data history lengkap.
            </p>
            <div>
              <Link href="/admin" className="btn-primary">
                Login Admin
              </Link>
            </div>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="page-hero">
        <div>
          <p className="page-kicker">Activity Timeline</p>
          <h1 className="page-title">History Log</h1>
          <p className="page-subtitle">
            Audit trail peminjaman dan pengembalian alat secara kronologis.
          </p>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Total Log</p>
          <p className="kpi-value">{stats.total}</p>
          <p className="kpi-meta">Semua entri riwayat</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Peminjaman</p>
          <p className="kpi-value">{stats.checkout}</p>
          <p className="kpi-meta">Total checkout</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Pengembalian</p>
          <p className="kpi-value">{stats.checkin}</p>
          <p className="kpi-meta">Total checkin</p>
        </article>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama alat, teknisi, no seri, lokasi"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ flex: 1, minWidth: 220, maxWidth: 420 }}
        />
        <select
          className="input-modern"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as 'all' | 'checkout' | 'checkin')}
          style={{ width: 160 }}
        >
          <option value="all">Semua aksi</option>
          <option value="checkout">Peminjaman</option>
          <option value="checkin">Pengembalian</option>
        </select>
        <select
          className="input-modern"
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">Semua bulan</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {formatMonth(month)}
            </option>
          ))}
        </select>
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <button className="btn-secondary" onClick={generateExcel} disabled={generating || filtered.length === 0}>
          {generating ? 'Processing...' : 'Download Laporan (.xlsx)'}
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
                    <SortableHeader column="timestamp" label="Waktu" />
                    <SortableHeader column="nama" label="Nama Alat" />
                    <SortableHeader column="noSeri" label="No Seri" />
                    <SortableHeader column="aksi" label="Aksi" />
                    <SortableHeader column="teknisi" label="Teknisi" />
                    <SortableHeader column="lokasi" label="Lokasi" />
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.items.map((item) => (
                    <tr key={item.eventId}>
                      <td data-label="Waktu">{formatTimestamp(item.timestamp)}</td>
                      <td data-label="Nama Alat">
                        <strong>{item.nama}</strong>
                        <div className="panel-subtitle">{`${item.merk} / ${item.tipe}`}</div>
                      </td>
                      <td className="text-mono" data-label="No Seri">{item.noSeri || '-'}</td>
                      <td data-label="Aksi">
                        <span className={`badge badge-${item.aksi}`}>{item.aksi === 'checkout' ? 'Peminjaman' : 'Pengembalian'}</span>
                      </td>
                      <td data-label="Teknisi">{item.teknisi || '-'}</td>
                      <td data-label="Lokasi">{item.lokasi || '-'}</td>
                      <td data-label="Catatan">{item.catatan || '-'}</td>
                    </tr>
                  ))}
                  {pagedHistory.totalItems === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">Tidak ada data yang cocok.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <PaginationControls
                page={pagedHistory.page}
                totalPages={pagedHistory.totalPages}
                totalItems={pagedHistory.totalItems}
                startItem={pagedHistory.startItem}
                endItem={pagedHistory.endItem}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}
