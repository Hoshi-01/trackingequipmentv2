'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';

interface EquipmentRecord {
  id: string;
  nama: string;
  merk: string;
  tipe: string;
  noSeri: string;
  kalibrasiTerakhir?: string;
  intervalKalibrasiBulan?: number;
  kalibrasiBerikutnya?: string;
  noSertifikatKalibrasi?: string;
  labKalibrasi?: string;
  biayaKalibrasi?: string;
  urlSertifikatKalibrasi?: string;
}

type CalibrationStatus = 'overdue' | 'urgent' | 'soon' | 'safe' | 'no_data';

interface CalibrationRow extends EquipmentRecord {
  nextCalibration: string;
  daysLeft: number | null;
  calibrationStatus: CalibrationStatus;
  statusLabel: string;
}

interface StatusFilterOption {
  value: 'all' | CalibrationStatus;
  label: string;
  icon: CalibrationStatus | 'all';
}

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'Semua', icon: 'all' },
  { value: 'overdue', label: 'Overdue', icon: 'overdue' },
  { value: 'urgent', label: 'Segera', icon: 'urgent' },
  { value: 'soon', label: 'Mendatang', icon: 'soon' },
  { value: 'safe', label: 'Aman', icon: 'safe' },
];

function normalizeDate(value: string | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function addMonths(value: string, months: number): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const next = new Date(parsed);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().split('T')[0];
}

function calculateCalibrationStatus(nextDate: string): { status: CalibrationStatus; daysLeft: number | null; label: string } {
  if (!nextDate) return { status: 'no_data', daysLeft: null, label: 'Belum diatur' };

  const parsed = new Date(nextDate);
  if (Number.isNaN(parsed.getTime())) return { status: 'no_data', daysLeft: null, label: 'Tanggal tidak valid' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((parsed.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) return { status: 'overdue', daysLeft, label: `Lewat ${Math.abs(daysLeft)} hari` };
  if (daysLeft <= 30) return { status: 'urgent', daysLeft, label: `${daysLeft} hari lagi` };
  if (daysLeft <= 90) return { status: 'soon', daysLeft, label: `${daysLeft} hari lagi` };
  return { status: 'safe', daysLeft, label: `${daysLeft} hari lagi` };
}

function formatDate(value: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: CalibrationStatus) {
  if (status === 'overdue') return { className: 'badge-overdue', label: 'OVERDUE', tone: 'overdue' };
  if (status === 'urgent') return { className: 'badge-urgent', label: 'SEGERA', tone: 'urgent' };
  if (status === 'soon') return { className: 'badge-soon', label: 'MENDATANG', tone: 'soon' };
  if (status === 'safe') return { className: 'badge-safe', label: 'AMAN', tone: 'safe' };
  return { className: 'badge-maintenance', label: 'BELUM DATA', tone: 'no_data' };
}

function getDateAccentClass(status: CalibrationStatus): string {
  if (status === 'overdue') return 'calibration-date-overdue';
  if (status === 'urgent') return 'calibration-date-urgent';
  if (status === 'soon') return 'calibration-date-soon';
  if (status === 'safe') return 'calibration-date-safe';
  return 'calibration-date-neutral';
}

function getTimelineProgress(status: CalibrationStatus, daysLeft: number | null): number {
  if (daysLeft === null) return 8;
  if (status === 'overdue') return Math.min(100, 55 + Math.min(45, Math.abs(daysLeft)));
  if (status === 'urgent') return Math.max(70, 100 - Math.max(0, daysLeft));
  if (status === 'soon') return Math.max(38, 72 - Math.floor((Math.max(31, daysLeft) - 31) * 0.55));
  if (status === 'safe') return 26;
  return 12;
}

function toExternalUrl(rawValue: string | undefined): string {
  const value = (rawValue || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

function StatusGlyph({ status }: { status: CalibrationStatus | 'all' }) {
  if (status === 'overdue') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8.25v4.5m0 3h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === 'urgent') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    );
  }
  if (status === 'soon') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008z"
        />
      </svg>
    );
  }
  if (status === 'safe') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    );
  }
  if (status === 'no_data') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

export default function CalibrationPage() {
  const ALL_PAGE_SIZE = 1000000;
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CalibrationStatus>('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/equipment?sync=1');
        const data = await res.json();
        if (data.equipment) setEquipment(data.equipment);
      } catch (error) {
        console.error('Error fetching calibration data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const rows = useMemo<CalibrationRow[]>(() => {
    return equipment
      .map((item) => {
        const lastCalibration = normalizeDate(item.kalibrasiTerakhir);
        const interval = Number.isFinite(item.intervalKalibrasiBulan) && (item.intervalKalibrasiBulan || 0) > 0
          ? Math.round(item.intervalKalibrasiBulan as number)
          : 12;
        const nextCalibration = normalizeDate(item.kalibrasiBerikutnya) || (lastCalibration ? addMonths(lastCalibration, interval) : '');
        const derivedStatus = calculateCalibrationStatus(nextCalibration);

        return {
          ...item,
          kalibrasiTerakhir: lastCalibration,
          intervalKalibrasiBulan: interval,
          nextCalibration,
          daysLeft: derivedStatus.daysLeft,
          calibrationStatus: derivedStatus.status,
          statusLabel: derivedStatus.label,
        };
      })
      .sort((a, b) => {
        const aValue = a.daysLeft === null ? Number.POSITIVE_INFINITY : a.daysLeft;
        const bValue = b.daysLeft === null ? Number.POSITIVE_INFINITY : b.daysLeft;
        return aValue - bValue;
      });
  }, [equipment]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(q) ||
        item.noSeri.toLowerCase().includes(q) ||
        (item.labKalibrasi || '').toLowerCase().includes(q) ||
        (item.noSertifikatKalibrasi || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || item.calibrationStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const pagedRows = useMemo(() => getPaginatedItems(filteredRows, page, pageSize), [filteredRows, page, pageSize]);

  useEffect(() => {
    if (pagedRows.page !== page) setPage(pagedRows.page);
  }, [pagedRows.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const stats = useMemo(() => {
    const overdue = rows.filter((item) => item.calibrationStatus === 'overdue').length;
    const urgent = rows.filter((item) => item.calibrationStatus === 'urgent').length;
    const soon = rows.filter((item) => item.calibrationStatus === 'soon').length;
    const safe = rows.filter((item) => item.calibrationStatus === 'safe').length;
    const noData = rows.filter((item) => item.calibrationStatus === 'no_data').length;
    return { total: rows.length, overdue, urgent, soon, safe, noData };
  }, [rows]);

  const upcomingRows = useMemo(
    () => rows.filter((item) => item.daysLeft !== null && (item.daysLeft as number) <= 90).slice(0, 6),
    [rows]
  );

  return (
    <DashboardLayout>
      <section className="page-hero">
        <div>
          <p className="page-kicker">Manajemen Kalibrasi</p>
          <h1 className="page-title">Jadwal Rekalibrasi Alat</h1>
          <p className="page-subtitle">
            Pantau jadwal kalibrasi tahunan semua alat ukur. Sistem memberi peringatan visual saat mendekati
            atau melewati jadwal kalibrasi.
          </p>
        </div>
        <div className="hero-pill">
          <small>Total Alat Dipantau</small>
          <strong>{`${stats.total} alat`}</strong>
        </div>
      </section>

      <section className="kpi-grid calibration-kpi-grid">
        <article className="kpi-card calibration-kpi-card calibration-kpi-overdue">
          <span className="calibration-kpi-icon">
            <StatusGlyph status="overdue" />
          </span>
          <div className="calibration-kpi-copy">
            <p className="kpi-value">{stats.overdue}</p>
            <p className="kpi-label">Overdue</p>
            <p className="kpi-meta">Lewat jadwal</p>
          </div>
        </article>
        <article className="kpi-card calibration-kpi-card calibration-kpi-urgent">
          <span className="calibration-kpi-icon">
            <StatusGlyph status="urgent" />
          </span>
          <div className="calibration-kpi-copy">
            <p className="kpi-value">{stats.urgent}</p>
            <p className="kpi-label">Segera</p>
            <p className="kpi-meta">0 - 30 hari</p>
          </div>
        </article>
        <article className="kpi-card calibration-kpi-card calibration-kpi-soon">
          <span className="calibration-kpi-icon">
            <StatusGlyph status="soon" />
          </span>
          <div className="calibration-kpi-copy">
            <p className="kpi-value">{stats.soon}</p>
            <p className="kpi-label">Dalam 90 Hari</p>
            <p className="kpi-meta">31 - 90 hari</p>
          </div>
        </article>
        <article className="kpi-card calibration-kpi-card calibration-kpi-safe">
          <span className="calibration-kpi-icon">
            <StatusGlyph status="safe" />
          </span>
          <div className="calibration-kpi-copy">
            <p className="kpi-value">{stats.safe}</p>
            <p className="kpi-label">Terkalibrasi</p>
            <p className="kpi-meta">{`> 90 hari`}</p>
          </div>
        </article>
      </section>

      {stats.overdue > 0 && (
        <div className="notice notice-error calibration-alert" style={{ marginBottom: 12 }}>
          <span className="calibration-alert-icon">
            <StatusGlyph status="overdue" />
          </span>
          <p>
            <strong>{`${stats.overdue} alat sudah melewati jadwal kalibrasi!`}</strong>
            {' '}Segera catat rekalibrasi untuk menghindari hasil pengukuran tidak valid.
          </p>
        </div>
      )}

      <div className="toolbar calibration-toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama alat, no seri, lab, no sertifikat"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ flex: 1, minWidth: 220, maxWidth: 460 }}
        />
        <div className="calibration-filter-chips" role="group" aria-label="Filter status kalibrasi">
          {STATUS_FILTER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`calibration-filter-chip calibration-filter-chip-${option.icon}${statusFilter === option.value ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(option.value)}
            >
              <span className="calibration-filter-chip-icon">
                <StatusGlyph status={option.icon} />
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <Link href="/admin" className="btn-primary">
          + Catat Kalibrasi Baru
        </Link>
      </div>

      {upcomingRows.length > 0 && (
        <section className="panel calibration-upcoming-panel" style={{ marginBottom: 14 }}>
          <header className="panel-header">
            <div>
              <h2 className="panel-title">Jadwal Terdekat</h2>
              <p className="panel-subtitle">Prioritas 90 hari ke depan</p>
            </div>
          </header>
          <div className="calibration-upcoming-grid">
            {upcomingRows.map((item) => (
              <article key={item.id} className={`calibration-upcoming-card calibration-upcoming-${item.calibrationStatus}`}>
                <div className="calibration-upcoming-head">
                  <span className="calibration-upcoming-icon">
                    <StatusGlyph status={item.calibrationStatus} />
                  </span>
                  <div>
                    <p className="list-item-title">{item.nama}</p>
                    <p className="list-item-meta">{item.noSeri}</p>
                  </div>
                </div>
                <div className="list-item-chip-wrap">
                  <span className="chip">{formatDate(item.nextCalibration)}</span>
                  <span className={`badge ${getStatusBadge(item.calibrationStatus).className}`}>{item.statusLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
                    <th>Alat</th>
                    <th>Kalibrasi Terakhir</th>
                    <th>Kalibrasi Berikutnya</th>
                    <th>Sisa Waktu</th>
                    <th>Status</th>
                    <th>Lab / Penyedia</th>
                    <th>No. Sertifikat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.items.map((item) => {
                    const badge = getStatusBadge(item.calibrationStatus);
                    const certificateUrl = toExternalUrl(item.urlSertifikatKalibrasi);
                    const timelineProgress = getTimelineProgress(item.calibrationStatus, item.daysLeft);
                    return (
                      <tr key={item.id} className={`calibration-row calibration-row-${item.calibrationStatus}`}>
                        <td data-label="Alat">
                          <strong>{item.nama}</strong>
                          <div className="panel-subtitle">{`${item.merk} / ${item.tipe}`}</div>
                          <div className="text-mono">{item.noSeri}</div>
                        </td>
                        <td data-label="Kalibrasi Terakhir">{formatDate(item.kalibrasiTerakhir || '')}</td>
                        <td data-label="Kalibrasi Berikutnya">
                          <span className={`calibration-date ${getDateAccentClass(item.calibrationStatus)}`}>
                            {formatDate(item.nextCalibration)}
                          </span>
                        </td>
                        <td data-label="Sisa Waktu">
                          <div className="calibration-time-cell">
                            <strong className={`calibration-time-label ${getDateAccentClass(item.calibrationStatus)}`}>
                              {item.statusLabel}
                            </strong>
                            <div className="calibration-time-track">
                              <span
                                className={`calibration-time-fill calibration-time-fill-${item.calibrationStatus}`}
                                style={{ width: `${timelineProgress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${badge.className} calibration-status-pill`}>
                            <span className={`calibration-status-dot calibration-status-dot-${badge.tone}`} />
                            {badge.label}
                          </span>
                        </td>
                        <td data-label="Lab">{item.labKalibrasi || '-'}</td>
                        <td className="text-mono" data-label="No. Sertifikat">{item.noSertifikatKalibrasi || '-'}</td>
                        <td data-label="Aksi">
                          <div className="calibration-actions">
                            <Link href="/admin" className="calibration-action-btn">
                              Jadwalkan
                            </Link>
                            {certificateUrl ? (
                              <a
                                href={certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="calibration-action-btn"
                              >
                                Sertifikat
                              </a>
                            ) : (
                              <span className="calibration-action-btn is-disabled">Sertifikat</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pagedRows.totalItems === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">Tidak ada data kalibrasi yang cocok.</div>
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

      {stats.noData > 0 && (
        <div className="notice" style={{ marginTop: 14 }}>
          {`${stats.noData} alat belum punya data kalibrasi lengkap. Lengkapi melalui Admin Panel.`}
        </div>
      )}
    </DashboardLayout>
  );
}
