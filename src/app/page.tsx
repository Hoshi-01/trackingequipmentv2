'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';

type EquipmentPriority = 'NONE' | 'P1' | 'P2' | 'P3';

interface Equipment {
  id: string;
  nama: string;
  merk: string;
  tipe: string;
  noSeri: string;
  status: 'available' | 'borrowed' | 'maintenance';
  prioritas: EquipmentPriority;
  lokasi: string;
  peminjam?: string;
  lastUpdate?: string;
}

interface Stats {
  total: number;
  available: number;
  borrowed: number;
  maintenance: number;
}

function getPriorityRank(value: EquipmentPriority): number {
  if (value === 'P1') return 1;
  if (value === 'P2') return 2;
  if (value === 'P3') return 3;
  return 99;
}

function getPriorityLabel(value: EquipmentPriority): string {
  if (value === 'P1' || value === 'P2' || value === 'P3') return value;
  return 'Non-Prioritas';
}

export default function DashboardPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, borrowed: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [priorityPage, setPriorityPage] = useState(1);
  const [borrowedPage, setBorrowedPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/equipment?sync=1');
        const data = await res.json();

        if (!data.equipment) return;

        const list: Equipment[] = data.equipment;
        setEquipment(list);

        const available = list.filter((item) => item.status === 'available').length;
        const borrowed = list.filter((item) => item.status === 'borrowed').length;
        const maintenance = list.filter((item) => item.status === 'maintenance').length;
        setStats({
          total: list.length,
          available,
          borrowed,
          maintenance,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEquipment = useMemo(
    () =>
      equipment.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.noSeri.toLowerCase().includes(q) ||
          item.lokasi.toLowerCase().includes(q) ||
          (item.peminjam || '').toLowerCase().includes(q)
        );
      }),
    [equipment, searchQuery]
  );

  const borrowedEquipment = useMemo(
    () =>
      filteredEquipment
        .filter((item) => item.status === 'borrowed')
        .sort((a, b) => {
          const byUpdate = (b.lastUpdate || '').localeCompare(a.lastUpdate || '');
          if (byUpdate !== 0) return byUpdate;
          return a.nama.localeCompare(b.nama);
        }),
    [filteredEquipment]
  );

  const prioritizedEquipment = useMemo(() => {
    const list = filteredEquipment
      .filter((item) => item.prioritas && item.prioritas !== 'NONE')
      .sort((a, b) => {
        const rankDiff = getPriorityRank(a.prioritas) - getPriorityRank(b.prioritas);
        if (rankDiff !== 0) return rankDiff;
        const nameDiff = a.nama.localeCompare(b.nama);
        if (nameDiff !== 0) return nameDiff;
        return a.noSeri.localeCompare(b.noSeri);
      });
    return list;
  }, [filteredEquipment]);

  const prioritizedPaged = useMemo(
    () => getPaginatedItems(prioritizedEquipment, priorityPage, pageSize),
    [prioritizedEquipment, priorityPage, pageSize]
  );
  const borrowedPaged = useMemo(
    () => getPaginatedItems(borrowedEquipment, borrowedPage, pageSize),
    [borrowedEquipment, borrowedPage, pageSize]
  );

  useEffect(() => {
    if (prioritizedPaged.page !== priorityPage) setPriorityPage(prioritizedPaged.page);
  }, [prioritizedPaged.page, priorityPage]);

  useEffect(() => {
    if (borrowedPaged.page !== borrowedPage) setBorrowedPage(borrowedPaged.page);
  }, [borrowedPaged.page, borrowedPage]);

  useEffect(() => {
    setPriorityPage(1);
    setBorrowedPage(1);
  }, [searchQuery, pageSize]);

  return (
    <DashboardLayout>
      <section className="page-hero">
        <div>
          <p className="page-kicker">Ringkasan Operasional</p>
          <h1 className="page-title">Pusat Kontrol Alat</h1>
          <p className="page-subtitle">
            Pantau status pinjam-kembali, cari aset lebih cepat, dan cek perangkat yang sedang aktif di lapangan.
          </p>
        </div>
        <div className="hero-pill">
          <small>Data Terkini</small>
          <strong>{loading ? 'Loading...' : `${stats.total} unit terdaftar`}</strong>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Total Alat</p>
          <p className="kpi-value">{loading ? '-' : stats.total}</p>
          <p className="kpi-meta">Basis data master aktif</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Tersedia</p>
          <p className="kpi-value">{loading ? '-' : stats.available}</p>
          <p className="kpi-meta">Ready untuk dipinjam</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Dipinjam</p>
          <p className="kpi-value">{loading ? '-' : stats.borrowed}</p>
          <p className="kpi-meta">Sedang digunakan teknisi</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Maintenance</p>
          <p className="kpi-value">{loading ? '-' : stats.maintenance}</p>
          <p className="kpi-meta">Perlu tindak lanjut</p>
        </article>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama alat, no seri, lokasi, atau peminjam"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ maxWidth: 460 }}
        />
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <span className="chip">{`${filteredEquipment.length} hasil`}</span>
      </div>

      <div className="content-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2 className="panel-title">Aset Prioritas</h2>
              <p className="panel-subtitle">Daftar prioritas aktif berdasarkan level P1-P3</p>
            </div>
          </header>
          {loading ? (
            <div className="empty-state">
              <div className="spinner" />
              <p style={{ marginTop: 10 }}>Memuat data...</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Nama Alat</th>
                    <th>No Seri</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritizedPaged.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Nama Alat">
                        <strong>{item.nama}</strong>
                        <div className="panel-subtitle">{`${item.merk} / ${item.tipe}`}</div>
                      </td>
                      <td className="text-mono" data-label="No Seri">{item.noSeri || '-'}</td>
                      <td data-label="Prioritas">
                        <span className="chip">{getPriorityLabel(item.prioritas || 'NONE')}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`badge badge-${item.status}`}>
                          {item.status === 'available' && 'Tersedia'}
                          {item.status === 'borrowed' && 'Dipinjam'}
                          {item.status === 'maintenance' && 'Maintenance'}
                        </span>
                      </td>
                      <td data-label="Lokasi">{item.lokasi || '-'}</td>
                    </tr>
                  ))}
                  {prioritizedEquipment.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">Belum ada alat dengan prioritas aktif.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '0 14px 14px' }}>
            <PaginationControls
              page={prioritizedPaged.page}
              totalPages={prioritizedPaged.totalPages}
              totalItems={prioritizedPaged.totalItems}
              startItem={prioritizedPaged.startItem}
              endItem={prioritizedPaged.endItem}
              onPageChange={setPriorityPage}
            />
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2 className="panel-title">Sedang Dipinjam</h2>
              <p className="panel-subtitle">Semua alat yang belum dikembalikan</p>
            </div>
          </header>
          <div className="list-stack">
            {borrowedPaged.totalItems === 0 ? (
              <div className="empty-state">Tidak ada alat yang sedang dipinjam.</div>
            ) : (
              borrowedPaged.items.map((item) => (
                <article key={item.id} className="list-item">
                  <p className="list-item-title">{item.nama}</p>
                  <p className="list-item-meta">{item.noSeri}</p>
                  <div className="list-item-chip-wrap">
                    <span className="chip">{item.lokasi || 'Lokasi tidak tersedia'}</span>
                    <span className="chip">{item.peminjam || 'Tanpa nama teknisi'}</span>
                  </div>
                </article>
              ))
            )}
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <PaginationControls
              page={borrowedPaged.page}
              totalPages={borrowedPaged.totalPages}
              totalItems={borrowedPaged.totalItems}
              startItem={borrowedPaged.startItem}
              endItem={borrowedPaged.endItem}
              onPageChange={setBorrowedPage}
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
