'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';

interface Equipment {
  id: string;
  nama: string;
  tipe: string;
  noSeri: string;
}

type SortColumn = 'nama' | 'tipe' | 'noSeri';

function getSortLabel(active: boolean, direction: 'asc' | 'desc') {
  if (!active) return '<>';
  return direction === 'asc' ? '^' : 'v';
}

export default function EquipmentPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/equipment?sync=1');
        const data = await res.json();
        if (data.equipment) setEquipment(data.equipment);
      } catch (error) {
        console.error('Error fetching equipment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filtered = useMemo(() => {
    const result = equipment.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.nama.toLowerCase().includes(q) ||
        item.tipe.toLowerCase().includes(q) ||
        item.noSeri.toLowerCase().includes(q);
      return matchSearch;
    });

    result.sort((a, b) => {
      const valA =
        sortColumn === 'nama'
          ? a.nama.toLowerCase()
          : sortColumn === 'tipe'
            ? (a.tipe || '').toLowerCase()
            : (a.noSeri || '').toLowerCase();
      const valB =
        sortColumn === 'nama'
          ? b.nama.toLowerCase()
          : sortColumn === 'tipe'
            ? (b.tipe || '').toLowerCase()
            : (b.noSeri || '').toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [equipment, searchQuery, sortColumn, sortDirection]);

  const pagedEquipment = useMemo(() => getPaginatedItems(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    if (pagedEquipment.page !== page) setPage(pagedEquipment.page);
  }, [pagedEquipment.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const generateExcel = async () => {
    setGenerating(true);
    try {
      const XLSX = await import('xlsx');
      const data: string[][] = [['No', 'Nama Alat', 'Tipe', 'No. Seri']];

      filtered.forEach((item, index) => {
        data.push([String(index + 1), item.nama, item.tipe || '-', item.noSeri || '-']);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 18 },
        { wch: 24 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar Alat');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Daftar_Alat_${new Date().toISOString().split('T')[0]}.xlsx`;
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
          <p className="page-kicker">Asset Inventory</p>
          <h1 className="page-title">Daftar Alat</h1>
          <p className="page-subtitle">
            Inventaris lengkap peralatan kalibrasi dengan status real-time untuk operasional lapangan.
          </p>
        </div>
        <div className="hero-pill">
          <small>Inventory Size</small>
          <strong>{`${equipment.length} unit`}</strong>
        </div>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama, tipe, no seri"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ flex: 1, minWidth: 220, maxWidth: 460 }}
        />
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <button className="btn-secondary" onClick={generateExcel} disabled={generating || filtered.length === 0}>
          {generating ? 'Processing...' : 'Export Data (.xlsx)'}
        </button>
        <span className="chip">{`${filtered.length} data`}</span>
      </div>

      <section className="panel">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p style={{ marginTop: 10 }}>Memuat data...</p>
          </div>
        ) : pagedEquipment.totalItems === 0 ? (
          <div className="empty-state">Tidak ada data yang cocok.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>No</th>
                    <SortableHeader column="nama" label="Nama Alat" />
                    <SortableHeader column="tipe" label="Tipe" />
                    <SortableHeader column="noSeri" label="No Seri" />
                  </tr>
                </thead>
                <tbody>
                  {pagedEquipment.items.map((item, index) => (
                    <tr key={item.id}>
                      <td data-label="No">{(pagedEquipment.page - 1) * pagedEquipment.pageSize + index + 1}</td>
                      <td data-label="Nama Alat">
                        <strong>{item.nama}</strong>
                      </td>
                      <td data-label="Tipe">{item.tipe || '-'}</td>
                      <td className="text-mono" data-label="No Seri">{item.noSeri || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <PaginationControls
                page={pagedEquipment.page}
                totalPages={pagedEquipment.totalPages}
                totalItems={pagedEquipment.totalItems}
                startItem={pagedEquipment.startItem}
                endItem={pagedEquipment.endItem}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>

      <div className="notice" style={{ marginTop: 14 }}>
        Manajemen tambah/edit/nonaktifkan alat dan jadwal rekalibrasi tersedia di Admin Panel.
      </div>
    </DashboardLayout>
  );
}
