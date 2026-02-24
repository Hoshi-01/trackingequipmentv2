'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import QRCode from 'react-qr-code';
import DashboardLayout from '@/components/DashboardLayout';
import PaginationControls from '@/components/PaginationControls';
import { getPaginatedItems } from '@/lib/pagination';

interface Equipment {
  id: string;
  nama: string;
  merk: string;
  tipe: string;
  noSeri: string;
}

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfqW2VsdVLogsaE6HVkKP_Rte6MHyMZIR5-8Ll1VGo0Wt8HQg/viewform';

function generateQRValue(item: Equipment) {
  const params = new URLSearchParams();
  params.set('entry.385885798', item.nama);
  params.set('entry.709475568', item.merk);
  params.set('entry.17849064', item.tipe);
  params.set('entry.1886868305', item.noSeri);
  return `${FORM_URL}?usp=pp_url&${params.toString()}`;
}

export default function QRCodePage() {
  const ALL_PAGE_SIZE = 1000000;
  const pathname = usePathname();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
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
        console.error('Error fetching equipment for qr:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setSelectedItem(null);
  }, [pathname]);

  useEffect(() => {
    if (!selectedItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedItem(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return equipment.filter((item) => item.nama.toLowerCase().includes(q) || item.noSeri.toLowerCase().includes(q));
  }, [equipment, searchQuery]);

  const pagedFiltered = useMemo(() => getPaginatedItems(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    if (pagedFiltered.page !== page) setPage(pagedFiltered.page);
  }, [pagedFiltered.page, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const drawCenteredLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 2
  ) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });

    if (current) lines.push(current);

    lines.slice(0, maxLines).forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });
  };

  const downloadQR = (item: Equipment) => {
    const svg = document.getElementById(`qr-${item.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
      const width = 620;
      const height = 760;
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (ctx) {
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        const qrSize = 420;
        const qrX = (width - qrSize) / 2;
        const qrY = 54;

        ctx.strokeStyle = '#d3dfed';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28);
        ctx.drawImage(image, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = '#112438';
        ctx.textAlign = 'center';
        ctx.font = '700 28px Arial';
        drawCenteredLines(ctx, item.nama, width / 2, 532, 520, 34, 2);

        ctx.fillStyle = '#2e4e6f';
        ctx.font = '600 20px Arial';
        ctx.fillText(item.noSeri, width / 2, 620);

        ctx.fillStyle = '#4d6a86';
        ctx.font = '500 18px Arial';
        drawCenteredLines(ctx, `${item.merk} / ${item.tipe}`, width / 2, 662, 520, 24, 2);
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `QR_${item.nama}_${item.noSeri}.png`;
      link.click();
    };

    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const downloadAllQR = async () => {
    for (const item of filtered) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      downloadQR(item);
    }
  };

  return (
    <DashboardLayout>
      <section className="page-hero">
        <div>
          <p className="page-kicker">QR Operations</p>
          <h1 className="page-title">QR Code Generator</h1>
          <p className="page-subtitle">
            Generate QR untuk pre-filled form Google agar input pinjam-kembali lebih cepat dan minim kesalahan.
          </p>
        </div>
        <button className="btn-primary" onClick={downloadAllQR} disabled={loading || filtered.length === 0}>
          Download Semua ({filtered.length})
        </button>
      </section>

      <div className="toolbar">
        <input
          type="text"
          className="input-modern"
          placeholder="Cari nama alat atau no seri"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ maxWidth: 380, flex: 1 }}
        />
        <select className="input-modern page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={ALL_PAGE_SIZE}>All</option>
        </select>
        <span className="chip">{`${filtered.length} QR`}</span>
      </div>

      {loading ? (
        <div className="panel">
          <div className="empty-state">
            <div className="spinner" />
            <p style={{ marginTop: 10 }}>Memuat data...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div className="empty-state">Tidak ada data yang cocok.</div>
        </div>
      ) : (
        <section className="stack">
          <div className="qr-grid">
            {pagedFiltered.items.map((item) => (
              <article key={item.id} className="qr-tile" onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                <div className="qr-frame">
                  <QRCode id={`qr-${item.id}`} value={generateQRValue(item)} size={164} level="Q" />
                </div>
                <div className="qr-meta">
                  <strong className="qr-title">{item.nama}</strong>
                  <span className="text-mono qr-code">{item.noSeri}</span>
                  <span className="panel-subtitle">{`${item.merk} / ${item.tipe}`}</span>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    downloadQR(item);
                  }}
                >
                  Download PNG
                </button>
              </article>
            ))}
          </div>
          <PaginationControls
            page={pagedFiltered.page}
            totalPages={pagedFiltered.totalPages}
            totalItems={pagedFiltered.totalItems}
            startItem={pagedFiltered.startItem}
            endItem={pagedFiltered.endItem}
            onPageChange={setPage}
          />
        </section>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)} style={{ zIndex: 15 }}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ textAlign: 'center', position: 'relative' }}>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Tutup preview QR"
              onClick={() => setSelectedItem(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 38, height: 38, padding: 0 }}
            >
              x
            </button>
            <h2 style={{ fontSize: 24 }}>Preview QR</h2>
            <p className="panel-subtitle" style={{ marginTop: 8 }}>
              {`${selectedItem.nama} / ${selectedItem.noSeri}`}
            </p>

            <div className="qr-frame qr-frame-preview" style={{ display: 'inline-grid', marginTop: 16 }}>
              <QRCode value={generateQRValue(selectedItem)} size={292} level="H" />
            </div>

            <div className="toolbar" style={{ justifyContent: 'center', marginTop: 18 }}>
              <button className="btn-secondary" onClick={() => setSelectedItem(null)}>
                Tutup
              </button>
              <button className="btn-primary" onClick={() => downloadQR(selectedItem)}>
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
