'use client';

import { useEffect, useRef, useState } from 'react';
import { DateRange, type RangeKeyDict } from 'react-date-range';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionRange, setSelectionRange] = useState({
    startDate: startDate || new Date(),
    endDate: endDate || new Date(),
    key: 'selection',
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    setSelectionRange({
      startDate: selection.startDate || new Date(),
      endDate: selection.endDate || new Date(),
      key: 'selection',
    });
    onChange(selection.startDate || null, selection.endDate || null);
  };

  const handleClear = () => {
    setSelectionRange({
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    });
    onChange(null, null);
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!startDate || !endDate) return 'Pilih rentang tanggal';
    const start = format(startDate, 'd MMM yyyy', { locale: id });
    const end = format(endDate, 'd MMM yyyy', { locale: id });
    return `${start} - ${end}`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input-modern"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minWidth: 230,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{formatDisplay()}</span>
        {(startDate || endDate) && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              handleClear();
            }}
            title="Reset filter tanggal"
            style={{ fontSize: 12, opacity: 0.72 }}
          >
            Reset
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <style>{`
            .rdrCalendarWrapper {
              background: var(--bg-surface) !important;
              color: var(--text-primary) !important;
            }
            .rdrMonthAndYearWrapper {
              background: var(--bg-surface-soft) !important;
            }
            .rdrMonthAndYearPickers select {
              background: var(--bg-surface) !important;
              color: var(--text-primary) !important;
              border: 1px solid var(--border) !important;
              border-radius: 8px !important;
            }
            .rdrWeekDay,
            .rdrMonthName {
              color: var(--text-secondary) !important;
            }
            .rdrDayNumber span {
              color: var(--text-primary) !important;
            }
            .rdrDayPassive .rdrDayNumber span {
              color: var(--text-muted) !important;
            }
            .rdrSelected,
            .rdrInRange,
            .rdrStartEdge,
            .rdrEndEdge {
              background: var(--primary) !important;
            }
            .rdrDayInPreview,
            .rdrDayStartPreview,
            .rdrDayEndPreview {
              border-color: var(--primary) !important;
            }
            .rdrDayToday .rdrDayNumber span:after {
              background: var(--accent) !important;
            }
          `}</style>
          <DateRange
            ranges={[selectionRange]}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            locale={id}
            rangeColors={['#0a7bff']}
            showDateDisplay={false}
          />
        </div>
      )}
    </div>
  );
}
