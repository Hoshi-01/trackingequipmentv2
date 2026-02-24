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
  kalibrasiTerakhir?: string;
  intervalKalibrasiBulan?: number;
  kalibrasiBerikutnya?: string;
  noSertifikatKalibrasi?: string;
  labKalibrasi?: string;
  biayaKalibrasi?: string;
  urlSertifikatKalibrasi?: string;
}

interface SyncChange {
  rowNumber: number;
  nama: string;
  noSeri: string;
  before: {
    status: 'available' | 'borrowed' | 'maintenance';
    lokasi: string;
    peminjam: string;
  };
  after: {
    status: 'available' | 'borrowed' | 'maintenance';
    lokasi: string;
    peminjam: string;
  };
  reason: string;
}

interface SyncPreview {
  updated: number;
  unchanged: number;
  changes: SyncChange[];
}

const defaultForm = {
  nama: '',
  merk: '',
  tipe: '',
  noSeri: '',
  status: 'available' as Equipment['status'],
  lokasi: 'Gudang',
  kalibrasiTerakhir: '',
  intervalKalibrasiBulan: '12',
  kalibrasiBerikutnya: '',
  noSertifikatKalibrasi: '',
  labKalibrasi: '',
  biayaKalibrasi: '',
  urlSertifikatKalibrasi: '',
};

const PRIORITY_OPTIONS: EquipmentPriority[] = ['NONE', 'P1', 'P2', 'P3'];

function getPriorityLabel(value: EquipmentPriority): string {
  if (value === 'P1') return 'P1';
  if (value === 'P2') return 'P2';
  if (value === 'P3') return 'P3';
  return 'Non-Prioritas';
}

function toYmd(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function addMonths(baseDate: string, months: number): string {
  const parsed = new Date(baseDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const next = new Date(parsed);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().split('T')[0];
}

function getCalibrationBadge(nextDate: string | undefined): { label: string; className: string } {
  if (!nextDate) return { label: 'Belum diatur', className: 'badge-maintenance' };

  const parsed = new Date(nextDate);
  if (Number.isNaN(parsed.getTime())) return { label: 'Tanggal tidak valid', className: 'badge-maintenance' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((parsed.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `Lewat ${Math.abs(diffDays)} hari`, className: 'badge-overdue' };
  if (diffDays <= 30) return { label: `${diffDays} hari lagi`, className: 'badge-urgent' };
  if (diffDays <= 90) return { label: `${diffDays} hari lagi`, className: 'badge-soon' };
  return { label: `${diffDays} hari lagi`, className: 'badge-safe' };
}

export default function AdminPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityItem, setPriorityItem] = useState<Equipment | null>(null);
  const [priorityValue, setPriorityValue] = useState<EquipmentPriority>('NONE');
  const [prioritySaving, setPrioritySaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('adminLoggedIn');
    if (saved === 'true') {
      setIsLoggedIn(true);
      fetchData();
    }
  }, []);

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!data.success) {
        setLoginError(data.error || 'Password salah');
        return;
      }

      setIsLoggedIn(true);
      localStorage.setItem('adminLoggedIn', 'true');
      window.dispatchEvent(new Event('admin-auth-changed'));
      fetchData();
    } catch {
      setLoginError('Gagal login. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
    window.dispatchEvent(new Event('admin-auth-changed'));
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 4200);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3200);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      merk: item.merk,
      tipe: item.tipe,
      noSeri: item.noSeri,
      status: item.status,
      lokasi: item.lokasi,
      kalibrasiTerakhir: item.kalibrasiTerakhir || '',
      intervalKalibrasiBulan: String(item.intervalKalibrasiBulan || 12),
      kalibrasiBerikutnya: item.kalibrasiBerikutnya || '',
      noSertifikatKalibrasi: item.noSertifikatKalibrasi || '',
      labKalibrasi: item.labKalibrasi || '',
      biayaKalibrasi: item.biayaKalibrasi || '',
      urlSertifikatKalibrasi: item.urlSertifikatKalibrasi || '',
    });
    setShowModal(true);
  };

  const openPriorityModal = (item: Equipment) => {
    setPriorityItem(item);
    setPriorityValue(item.prioritas || 'NONE');
    setShowPriorityModal(true);
  };

  const handleSavePriority = async () => {
    if (!priorityItem) return;

    const nextPriority = priorityValue;
    const currentPriority = priorityItem.prioritas || 'NONE';

    if (nextPriority === currentPriority) {
      setShowPriorityModal(false);
      return;
    }

    const confirmText = `Ubah prioritas "${priorityItem.nama}" (${priorityItem.noSeri}) dari ${getPriorityLabel(
      currentPriority
    )} ke ${getPriorityLabel(nextPriority)}?`;
    if (!confirm(confirmText)) return;

    setPrioritySaving(true);
    try {
      const res = await fetch(`/api/equipment/${priorityItem.id}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritas: nextPriority }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah prioritas.');
      }

      showSuccess(data.message || 'Prioritas berhasil diperbarui.');
      setShowPriorityModal(false);
      setPriorityItem(null);
      fetchData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gagal mengubah prioritas.');
    } finally {
      setPrioritySaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama.trim() || !formData.noSeri.trim()) {
      showError('Nama alat dan no seri wajib diisi.');
      return;
    }

    const normalizedNoSeri = formData.noSeri.trim().toLowerCase();
    const duplicate = equipment.some((item) => {
      if (editingItem && item.id === editingItem.id) return false;
      return item.noSeri.trim().toLowerCase() === normalizedNoSeri;
    });

    if (duplicate) {
      showError('No seri sudah digunakan oleh alat lain.');
      return;
    }

    const calibrationLastDate = toYmd(formData.kalibrasiTerakhir);
    const parsedInterval = Number(formData.intervalKalibrasiBulan || 12);
    const calibrationInterval = Number.isFinite(parsedInterval) && parsedInterval > 0 ? Math.round(parsedInterval) : 12;
    const calibrationNextDate =
      toYmd(formData.kalibrasiBerikutnya) ||
      (calibrationLastDate ? addMonths(calibrationLastDate, calibrationInterval) : '');

    const payload = {
      ...formData,
      kalibrasiTerakhir: calibrationLastDate,
      intervalKalibrasiBulan: calibrationInterval,
      kalibrasiBerikutnya: calibrationNextDate,
    };

    setUpdating('saving');
    try {
      const url = editingItem ? `/api/equipment/${editingItem.id}` : '/api/equipment';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan data.');
      }

      setShowModal(false);
      showSuccess(editingItem ? 'Perubahan alat berhasil disimpan.' : 'Alat baru berhasil ditambahkan.');
      fetchData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gagal menyimpan data.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    const keterangan = prompt('Masukkan alasan nonaktifkan alat:');
    if (keterangan === null) return;
    if (!keterangan.trim()) {
      showError('Keterangan nonaktif wajib diisi.');
      return;
    }

    setUpdating(id);
    try {
      const rowIndex = Number(id) - 1;
      const res = await fetch('/api/equipment/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex,
          keterangan: `${keterangan} - ${new Date().toLocaleDateString('id-ID')}`,
        }),
      });

      if (!res.ok) {
        showError('Gagal menonaktifkan alat.');
        return;
      }

      showSuccess('Alat berhasil dinonaktifkan.');
      fetchData();
    } catch (error) {
      showError(`Gagal menonaktifkan: ${String(error)}`);
    } finally {
      setUpdating(null);
    }
  };

  const updateStatus = async (id: string, newStatus: Equipment['status']) => {
    setUpdating(id);
    try {
      const payload: Record<string, string | undefined> = { status: newStatus };
      if (newStatus === 'available') {
        payload.lokasi = 'Gudang';
        payload.peminjam = '-';
      }

      const res = await fetch(`/api/equipment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showError('Gagal update status alat.');
        return;
      }
      fetchData();
    } catch {
      showError('Gagal update status alat.');
    } finally {
      setUpdating(null);
    }
  };

  const handleRecordRecalibration = async (item: Equipment) => {
    const noSertifikat = prompt('No. sertifikat kalibrasi (boleh kosong):', item.noSertifikatKalibrasi || '');
    if (noSertifikat === null) return;

    const labKalibrasi = prompt('Nama lab kalibrasi (boleh kosong):', item.labKalibrasi || '');
    if (labKalibrasi === null) return;

    const biayaKalibrasi = prompt('Biaya kalibrasi (opsional):', item.biayaKalibrasi || '');
    if (biayaKalibrasi === null) return;

    setUpdating(item.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/equipment/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kalibrasiTerakhir: today,
          noSertifikatKalibrasi: noSertifikat.trim(),
          labKalibrasi: labKalibrasi.trim(),
          biayaKalibrasi: biayaKalibrasi.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mencatat rekalibrasi.');
      }

      showSuccess(`Rekalibrasi ${item.nama} berhasil dicatat.`);
      fetchData();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gagal mencatat rekalibrasi.');
    } finally {
      setUpdating(null);
    }
  };

  const handleSyncPreview = async () => {
    setPreviewing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync-status?dryRun=1');
      const data = await res.json();

      if (!data.success) {
        setSyncPreview(null);
        setSyncMessage('Preview sync gagal dijalankan.');
        return;
      }

      setSyncPreview({
        updated: data.updated || 0,
        unchanged: data.unchanged || 0,
        changes: data.changes || [],
      });
      setSyncMessage(`Preview selesai. ${data.updated || 0} data akan di-update.`);
    } catch {
      setSyncPreview(null);
      setSyncMessage('Preview sync gagal dijalankan.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSyncApply = async () => {
    if (!confirm('Jalankan sync status dari Form Responses sekarang?')) return;

    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/force-sync', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setSyncMessage(`Sync gagal: ${data.error || 'unknown error'}`);
        return;
      }

      setSyncPreview(null);
      setSyncMessage(
        `Sync selesai. ${data.updated || 0} data di-update. Tersedia ${data.stats?.available ?? '-'}, dipinjam ${
          data.stats?.borrowed ?? '-'
        }.`
      );
      fetchData();
    } catch {
      setSyncMessage('Sync gagal dijalankan.');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return equipment
      .filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          item.noSeri.toLowerCase().includes(q) ||
          item.merk.toLowerCase().includes(q) ||
          item.lokasi.toLowerCase().includes(q) ||
          (item.peminjam || '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [equipment, searchQuery]);

  const pagedEquipment = useMemo(() => getPaginatedItems(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    if (pagedEquipment.page !== page) setPage(pagedEquipment.page);
  }, [pagedEquipment.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const borrowedCount = equipment.filter((item) => item.status === 'borrowed').length;
  const maintenanceCount = equipment.filter((item) => item.status === 'maintenance').length;

  const computedNextCalibrationDate = useMemo(() => {
    const normalizedLast = toYmd(formData.kalibrasiTerakhir);
    const parsedInterval = Number(formData.intervalKalibrasiBulan || 12);
    const interval = Number.isFinite(parsedInterval) && parsedInterval > 0 ? Math.round(parsedInterval) : 12;
    return toYmd(formData.kalibrasiBerikutnya) || (normalizedLast ? addMonths(normalizedLast, interval) : '');
  }, [formData.kalibrasiTerakhir, formData.intervalKalibrasiBulan, formData.kalibrasiBerikutnya]);

  if (!isLoggedIn) {
    return (
      <DashboardLayout>
        <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
          <section className="panel" style={{ width: '100%', maxWidth: 420, padding: 26 }}>
            <p className="page-kicker">Restricted Access</p>
            <h1 style={{ fontSize: 32 }}>Admin Login</h1>
            <p className="page-subtitle" style={{ marginTop: 6 }}>
              Masukkan password untuk mengakses panel kontrol.
            </p>

            <form onSubmit={handleLogin} className="stack" style={{ marginTop: 18 }}>
              <input
                type="password"
                className="input-modern"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loginLoading}
              />
              {loginError && <div className="notice notice-error">{loginError}</div>}
              <button type="submit" className="btn-primary" disabled={loginLoading}>
                {loginLoading ? 'Loading...' : 'Masuk'}
              </button>
            </form>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {(errorMessage || successMessage) && (
        <div className="toast-wrap">
          {errorMessage && <div className="toast notice-error">{errorMessage}</div>}
          {successMessage && <div className="toast notice-success">{successMessage}</div>}
        </div>
      )}

      <section className="page-hero">
        <div>
          <p className="page-kicker">Admin Console</p>
          <h1 className="page-title">Control Room</h1>
          <p className="page-subtitle">Kelola data alat, validasi sinkronisasi, dan update status operasional.</p>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button className="btn-secondary" onClick={handleSyncPreview} disabled={previewing}>
            {previewing ? 'Previewing...' : 'Preview Sync'}
          </button>
          <button className="btn-primary" onClick={handleSyncApply} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Jalankan Sync'}
          </button>
          <button className="btn-secondary" onClick={openAddModal}>
            Tambah Alat
          </button>
          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      {syncMessage && (
        <div className={`notice ${syncMessage.toLowerCase().includes('gagal') ? 'notice-error' : 'notice-success'}`} style={{ marginBottom: 12 }}>
          {syncMessage}
        </div>
      )}

      {syncPreview && (
        <section className="panel" style={{ marginBottom: 14 }}>
          <header className="panel-header">
            <div>
              <h2 className="panel-title">Preview Perubahan Sync</h2>
              <p className="panel-subtitle">
                {syncPreview.updated} akan di-update, {syncPreview.unchanged} tetap.
              </p>
            </div>
          </header>
          {syncPreview.changes.length === 0 ? (
            <div className="empty-state">Tidak ada perubahan yang perlu disinkronkan.</div>
          ) : (
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Nama Alat</th>
                    <th>No Seri</th>
                    <th>Sebelum</th>
                    <th>Sesudah</th>
                    <th>Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {syncPreview.changes.slice(0, 12).map((change) => (
                    <tr key={`${change.rowNumber}-${change.noSeri}`}>
                      <td>{change.nama || '-'}</td>
                      <td className="text-mono">{change.noSeri || '-'}</td>
                      <td>{`${change.before.status} | ${change.before.lokasi}`}</td>
                      <td>{`${change.after.status} | ${change.after.lokasi}`}</td>
                      <td>{change.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Total Alat</p>
          <p className="kpi-value">{equipment.length}</p>
          <p className="kpi-meta">Data aktif di dashboard</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Dipinjam</p>
          <p className="kpi-value">{borrowedCount}</p>
          <p className="kpi-meta">Status borrowed</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Maintenance</p>
          <p className="kpi-value">{maintenanceCount}</p>
          <p className="kpi-meta">Perlu tindak lanjut</p>
        </article>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama alat, merk, atau no seri"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ maxWidth: 420, flex: 1 }}
        />
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <span className="chip">{`${filtered.length} item`}</span>
      </div>

      <section className="panel">
        <header className="panel-header">
          <div>
            <h2 className="panel-title">Master Alat</h2>
            <p className="panel-subtitle">Kelola status dan data peralatan</p>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p style={{ marginTop: 10 }}>Memuat data...</p>
          </div>
        ) : pagedEquipment.totalItems === 0 ? (
          <div className="empty-state">Tidak ada data yang cocok.</div>
        ) : (
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Nama Alat</th>
                  <th>Merk / Tipe</th>
                  <th>No Seri</th>
                  <th>Status</th>
                  <th>Prioritas</th>
                  <th>Lokasi</th>
                  <th>Rekalibrasi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagedEquipment.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Nama Alat">
                      <strong>{item.nama}</strong>
                    </td>
                    <td data-label="Merk / Tipe">{`${item.merk || '-'} / ${item.tipe || '-'}`}</td>
                    <td className="text-mono" data-label="No Seri">{item.noSeri || '-'}</td>
                    <td data-label="Status">
                      <span className={`badge badge-${item.status}`}>
                        {item.status === 'available' && 'Tersedia'}
                        {item.status === 'borrowed' && 'Dipinjam'}
                        {item.status === 'maintenance' && 'Maintenance'}
                      </span>
                    </td>
                    <td data-label="Prioritas">
                      <span className="chip">{getPriorityLabel(item.prioritas || 'NONE')}</span>
                    </td>
                    <td data-label="Lokasi">{item.lokasi || '-'}</td>
                    <td data-label="Rekalibrasi">
                      {(() => {
                        const calibrationBadge = getCalibrationBadge(item.kalibrasiBerikutnya);
                        return (
                          <div className="stack" style={{ gap: 6 }}>
                            <span className={`badge ${calibrationBadge.className}`}>{calibrationBadge.label}</span>
                            <div className="panel-subtitle">{item.kalibrasiBerikutnya || '-'}</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td data-label="Aksi">
                      <div className="toolbar" style={{ marginBottom: 0 }}>
                        <button className="btn-secondary btn-sm" onClick={() => openEditModal(item)}>
                          Edit
                        </button>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleRecordRecalibration(item)}
                          disabled={updating === item.id}
                        >
                          Rekalibrasi
                        </button>
                        <button className="btn-ghost btn-sm" onClick={() => openPriorityModal(item)}>
                          Prioritas
                        </button>

                        {item.status === 'borrowed' && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => updateStatus(item.id, 'available')}
                            disabled={updating === item.id}
                          >
                            Kembalikan
                          </button>
                        )}

                        {item.status === 'available' && (
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => updateStatus(item.id, 'maintenance')}
                            disabled={updating === item.id}
                          >
                            Maintenance
                          </button>
                        )}

                        {item.status === 'maintenance' && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => updateStatus(item.id, 'available')}
                            disabled={updating === item.id}
                          >
                            Selesai
                          </button>
                        )}

                        <button className="btn-danger btn-sm" onClick={() => handleDeactivate(item.id)} disabled={updating === item.id}>
                          Nonaktifkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '14px' }}>
          <PaginationControls
            page={pagedEquipment.page}
            totalPages={pagedEquipment.totalPages}
            totalItems={pagedEquipment.totalItems}
            startItem={pagedEquipment.startItem}
            endItem={pagedEquipment.endItem}
            onPageChange={setPage}
          />
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ fontSize: 24 }}>{editingItem ? 'Edit Alat' : 'Tambah Alat Baru'}</h2>
            <p className="panel-subtitle" style={{ marginTop: 6 }}>
              Pastikan no seri unik dan status sesuai kondisi alat.
            </p>

            <div className="form-grid" style={{ marginTop: 16 }}>
              <input
                className="input-modern"
                placeholder="Nama Alat"
                value={formData.nama}
                onChange={(event) => setFormData((prev) => ({ ...prev, nama: event.target.value }))}
              />

              <div className="form-grid two">
                <input
                  className="input-modern"
                  placeholder="Merk"
                  value={formData.merk}
                  onChange={(event) => setFormData((prev) => ({ ...prev, merk: event.target.value }))}
                />
                <input
                  className="input-modern"
                  placeholder="Tipe"
                  value={formData.tipe}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tipe: event.target.value }))}
                />
              </div>

              <input
                className="input-modern"
                placeholder="No Seri"
                value={formData.noSeri}
                onChange={(event) => setFormData((prev) => ({ ...prev, noSeri: event.target.value }))}
              />

              <select
                className="input-modern"
                value={formData.status}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: event.target.value as Equipment['status'],
                  }))
                }
              >
                <option value="available">Tersedia</option>
                <option value="borrowed">Dipinjam</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <input
                className="input-modern"
                placeholder="Lokasi"
                value={formData.lokasi}
                onChange={(event) => setFormData((prev) => ({ ...prev, lokasi: event.target.value }))}
              />

              <div className="form-grid two">
                <label className="stack" style={{ gap: 6 }}>
                  <span className="panel-subtitle" style={{ fontWeight: 600 }}>Kalibrasi Terakhir</span>
                  <input
                    type="date"
                    className="input-modern"
                    value={formData.kalibrasiTerakhir}
                    onChange={(event) => setFormData((prev) => ({ ...prev, kalibrasiTerakhir: event.target.value }))}
                  />
                </label>
                <label className="stack" style={{ gap: 6 }}>
                  <span className="panel-subtitle" style={{ fontWeight: 600 }}>Interval (bulan)</span>
                  <input
                    type="number"
                    min={1}
                    className="input-modern"
                    value={formData.intervalKalibrasiBulan}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, intervalKalibrasiBulan: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="stack" style={{ gap: 6 }}>
                <span className="panel-subtitle" style={{ fontWeight: 600 }}>Kalibrasi Berikutnya (otomatis)</span>
                <input
                  className="input-modern"
                  value={computedNextCalibrationDate}
                  readOnly
                />
              </label>

              <div className="form-grid two">
                <input
                  className="input-modern"
                  placeholder="No. Sertifikat Kalibrasi"
                  value={formData.noSertifikatKalibrasi}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, noSertifikatKalibrasi: event.target.value }))
                  }
                />
                <input
                  className="input-modern"
                  placeholder="Lab Kalibrasi"
                  value={formData.labKalibrasi}
                  onChange={(event) => setFormData((prev) => ({ ...prev, labKalibrasi: event.target.value }))}
                />
              </div>

              <div className="form-grid two">
                <input
                  className="input-modern"
                  placeholder="Biaya Kalibrasi (opsional)"
                  value={formData.biayaKalibrasi}
                  onChange={(event) => setFormData((prev) => ({ ...prev, biayaKalibrasi: event.target.value }))}
                />
                <input
                  className="input-modern"
                  placeholder="URL Sertifikat (opsional)"
                  value={formData.urlSertifikatKalibrasi}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, urlSertifikatKalibrasi: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={updating === 'saving'}>
                {updating === 'saving' ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriorityModal && priorityItem && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (prioritySaving) return;
            setShowPriorityModal(false);
            setPriorityItem(null);
          }}
        >
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 style={{ fontSize: 24 }}>Ubah Prioritas</h2>
            <p className="panel-subtitle" style={{ marginTop: 6 }}>
              Ubah level prioritas tanpa mengubah data pinjam-kembali.
            </p>

            <div className="notice" style={{ marginTop: 16 }}>
              <strong>{priorityItem.nama}</strong>
              <div className="panel-subtitle">{priorityItem.noSeri || '-'}</div>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <label className="panel-subtitle" style={{ fontWeight: 600 }}>
                Level Prioritas
              </label>
              <select
                className="input-modern"
                value={priorityValue}
                onChange={(event) => setPriorityValue(event.target.value as EquipmentPriority)}
                disabled={prioritySaving}
              >
                {PRIORITY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {getPriorityLabel(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowPriorityModal(false);
                  setPriorityItem(null);
                }}
                disabled={prioritySaving}
              >
                Batal
              </button>
              <button className="btn-primary" onClick={handleSavePriority} disabled={prioritySaving}>
                {prioritySaving ? 'Menyimpan...' : 'Simpan Prioritas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
