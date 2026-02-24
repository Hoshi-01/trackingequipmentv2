export type HistoryAction = 'checkout' | 'checkin';
export type ReconciliationIssueType = 'duplicate_checkout' | 'orphan_checkin' | 'invalid_no_seri';

const INVALID_NO_SERI_VALUES = new Set(['-', 'na', 'n/a', 'null', 'undefined']);

export interface HistoryEventInput {
  eventId?: string;
  timestamp: string;
  noSeri: string;
  aksi: HistoryAction;
  teknisi?: string;
  lokasi?: string;
}

export interface ReconciledHistoryEvent extends HistoryEventInput {
  eventId: string;
  noSeriKey: string;
  timestampMs: number;
  valid: boolean;
  issueType?: ReconciliationIssueType;
  issueMessage?: string;
}

export interface ReconciledEquipmentState {
  noSeriKey: string;
  status: 'available' | 'borrowed';
  peminjam: string;
  lokasi: string;
  lastTimestamp: string;
  lastEventId: string | null;
  checkoutCount: number;
  checkinCount: number;
  invalidCheckoutCount: number;
  invalidCheckinCount: number;
}

export interface HistoryReconciliationResult {
  events: ReconciledHistoryEvent[];
  states: Map<string, ReconciledEquipmentState>;
  issues: ReconciledHistoryEvent[];
  validEventCount: number;
  ignoredNoSeriCount: number;
}

export function normalizeNoSeri(noSeri: string): string {
  return (noSeri || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[-_]+/g, '-');
}

export function isValidNoSeri(noSeri: string): boolean {
  if (!noSeri) return false;
  return !INVALID_NO_SERI_VALUES.has(noSeri);
}

export function normalizeHistoryAction(action: string): HistoryAction {
  const cleaned = (action || '').trim().toLowerCase();

  if (
    cleaned.startsWith('peminjam') ||
    cleaned.includes('pinjam') ||
    cleaned.includes('checkout') ||
    cleaned.includes('keluar') ||
    cleaned === 'borrow'
  ) {
    return 'checkout';
  }

  if (
    cleaned.startsWith('pengembali') ||
    cleaned.includes('kembali') ||
    cleaned.includes('checkin') ||
    cleaned === 'return'
  ) {
    return 'checkin';
  }

  return 'checkin';
}

export function parseHistoryTimestamp(timestamp: string): Date {
  const raw = (timestamp || '').trim();
  if (!raw) return new Date(0);

  const idFormat = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );

  if (idFormat) {
    const day = Number(idFormat[1]);
    const month = Number(idFormat[2]);
    const year = Number(idFormat[3]) < 100 ? 2000 + Number(idFormat[3]) : Number(idFormat[3]);
    const hour = Number(idFormat[4] || 0);
    const minute = Number(idFormat[5] || 0);
    const second = Number(idFormat[6] || 0);
    const date = new Date(year, month - 1, day, hour, minute, second);

    if (!Number.isNaN(date.getTime())) return date;
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return new Date(0);
}

function parseEventSequence(eventId: string): number | null {
  const match = (eventId || '').match(/(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function createInitialEquipmentState(noSeriKey: string): ReconciledEquipmentState {
  return {
    noSeriKey,
    status: 'available',
    peminjam: '-',
    lokasi: 'Gudang',
    lastTimestamp: '',
    lastEventId: null,
    checkoutCount: 0,
    checkinCount: 0,
    invalidCheckoutCount: 0,
    invalidCheckinCount: 0,
  };
}

export function reconcileHistoryEvents(records: HistoryEventInput[]): HistoryReconciliationResult {
  const prepared = records
    .map((record, index) => ({
      ...record,
      eventId: record.eventId || `evt-${index + 1}`,
      noSeriKey: normalizeNoSeri(record.noSeri || ''),
      timestampMs: parseHistoryTimestamp(record.timestamp).getTime(),
    }))
    .sort((a, b) => {
      if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
      const sequenceA = parseEventSequence(a.eventId);
      const sequenceB = parseEventSequence(b.eventId);
      if (sequenceA !== null && sequenceB !== null && sequenceA !== sequenceB) {
        return sequenceA - sequenceB;
      }
      return a.eventId.localeCompare(b.eventId);
    });

  const states = new Map<string, ReconciledEquipmentState>();
  const events: ReconciledHistoryEvent[] = [];
  let validEventCount = 0;
  let ignoredNoSeriCount = 0;

  for (const record of prepared) {
    if (!isValidNoSeri(record.noSeriKey)) {
      ignoredNoSeriCount++;
      events.push({
        ...record,
        valid: false,
        issueType: 'invalid_no_seri',
        issueMessage: 'No seri tidak valid, event diabaikan.',
      });
      continue;
    }

    const state = states.get(record.noSeriKey) || createInitialEquipmentState(record.noSeriKey);
    let valid = true;
    let issueType: ReconciliationIssueType | undefined;
    let issueMessage: string | undefined;

    if (record.aksi === 'checkout') {
      state.checkoutCount += 1;
      if (state.status === 'borrowed') {
        state.invalidCheckoutCount += 1;
        valid = false;
        issueType = 'duplicate_checkout';
        issueMessage = 'Checkout duplikat saat alat masih dipinjam.';
      } else {
        state.status = 'borrowed';
        state.peminjam = record.teknisi || '-';
        state.lokasi = record.lokasi || '-';
        state.lastTimestamp = record.timestamp || '';
        state.lastEventId = record.eventId;
      }
    } else {
      state.checkinCount += 1;
      if (state.status === 'available') {
        state.invalidCheckinCount += 1;
        valid = false;
        issueType = 'orphan_checkin';
        issueMessage = 'Checkin tanpa checkout aktif, event diabaikan.';
      } else {
        state.status = 'available';
        state.peminjam = '-';
        state.lokasi = 'Gudang';
        state.lastTimestamp = record.timestamp || '';
        state.lastEventId = record.eventId;
      }
    }

    states.set(record.noSeriKey, state);
    if (valid) validEventCount += 1;

    events.push({
      ...record,
      valid,
      issueType,
      issueMessage,
    });
  }

  const issues = events.filter((event) => !event.valid);

  return {
    events,
    states,
    issues,
    validEventCount,
    ignoredNoSeriCount,
  };
}
