import React, { useState, useMemo, useRef, useEffect } from 'react';
import './CalendarView.css';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { toFullCalendarEvent, parseAPIDate, formatEventTime, getTypeColor } from '../utils/scoring';
import { exportEventsToICS } from '../utils/exportICS';
import rawEvents from '../data/events_scored.json';
import { Calendar, List, Clock, AlertTriangle, Download, Share2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

// Helper to get start of week (Sunday)
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

// Helper to format YYYY-MM-DD
function toIsoDate(d) {
  // Event times are already normalised to IST by parseAPIDate. Avoid
  // toISOString() here because it can move date-only UI state into the
  // preceding UTC day.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function CalendarView({ 
  myEvents = [], 
  onRemoveEvent, 
  onSelectEventDetail,
  onSharePlan,
  ignoredConflictKeys = [],
  onIgnoreConflict,
  onRestoreIgnoredConflicts
}) {
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'timeGridDay' | 'listWeek' | 'timeGridWeek'
  const [focusedDate, setFocusedDate] = useState('2026-08-28');
  const [filterConflictsOnly, setFilterConflictsOnly] = useState(false);
  const [conflictIndex, setConflictIndex] = useState(0);

  const calendarRef = useRef(null);
  const firstWeekRef = useRef(null);

  // Compute Universal Schedule Conflicts & Conflict Dates
  const conflictPairs = useMemo(() => {
    const pairs = [];
    const n = myEvents.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const eventA = myEvents[i];
        const eventB = myEvents[j];

        const startA = parseAPIDate(eventA.start_date);
        const endA = parseAPIDate(eventA.end_date) || new Date(startA.getTime() + 2 * 3600 * 1000);
        const startB = parseAPIDate(eventB.start_date);
        const endB = parseAPIDate(eventB.end_date) || new Date(startB.getTime() + 2 * 3600 * 1000);

        if (startA && startB && startA < endB && endA > startB) {
          pairs.push({
            key: [String(eventA.id), String(eventB.id)].sort().join('::'),
            eventA,
            eventB,
            overlapStart: new Date(Math.max(startA.getTime(), startB.getTime())),
            overlapEnd: new Date(Math.min(endA.getTime(), endB.getTime())),
          });
        }
      }
    }

    return pairs;
  }, [myEvents]);

  const activeConflictPairs = useMemo(() => (
    conflictPairs.filter(pair => !ignoredConflictKeys.includes(pair.key))
  ), [conflictPairs, ignoredConflictKeys]);

  const conflictEventIds = useMemo(() => {
    const ids = new Set();
    activeConflictPairs.forEach(({ eventA, eventB }) => {
      ids.add(eventA.id);
      ids.add(eventB.id);
    });
    return ids;
  }, [activeConflictPairs]);

  const conflictDates = useMemo(() => {
    const datesSet = new Set();
    activeConflictPairs.forEach(({ overlapStart }) => {
      if (overlapStart) datesSet.add(toIsoDate(overlapStart));
    });
    return Array.from(datesSet).sort();
  }, [activeConflictPairs]);

  const conflictDateSet = useMemo(() => new Set(conflictDates), [conflictDates]);

  // Dynamic range computation for Festival Overview
  const festivalWeeks = useMemo(() => {
    const startIso = '2026-08-28';
    const endIso = '2026-09-27';

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    const visibleStart = getStartOfWeek(startDate); // Sun Aug 23, 2026
    
    const weeks = [];
    let current = new Date(visibleStart);

    while (current <= endDate || current.getDay() !== 0) {
      const weekDays = [];
      let monthName = null;

      for (let i = 0; i < 7; i++) {
        const dayIso = toIsoDate(current);
        const isFirstOfMonth = current.getDate() === 1 || (weeks.length === 0 && i === 0);
        
        if (isFirstOfMonth || (i === 0 && current.getDate() <= 7)) {
          monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
        }

        weekDays.push({
          dateObj: new Date(current),
          dateIso: dayIso,
          dayNum: current.getDate(),
          monthName: current.toLocaleDateString('en-US', { month: 'short' }),
          isMainWeekend: dayIso >= '2026-09-18' && dayIso <= '2026-09-20'
        });

        current.setDate(current.getDate() + 1);
      }

      weeks.push({
        weekId: weekDays[0].dateIso,
        days: weekDays,
        monthHeader: monthName
      });

      if (current > endDate && current.getDay() === 0) break;
    }

    return weeks;
  }, []);

  // Map events to dateIso for day cells (Multi-day events span across every day they run!)
  const eventsByDate = useMemo(() => {
    const plannedMap = {};
    const availableCountMap = {};

    // Available events count
    rawEvents.forEach(e => {
      const d = parseAPIDate(e.start_date);
      if (d) {
        const iso = toIsoDate(d);
        availableCountMap[iso] = (availableCountMap[iso] || 0) + 1;
      }
    });

    // Multi-day planned events span across all active days
    myEvents.forEach(e => {
      const start = parseAPIDate(e.start_date);
      const end = parseAPIDate(e.end_date) || start;
      if (!start) return;

      const cur = new Date(start);
      const endDay = new Date(end);

      while (cur <= endDay) {
        const iso = toIsoDate(cur);
        if (!plannedMap[iso]) plannedMap[iso] = [];
        if (!plannedMap[iso].some(item => item.id === e.id)) {
          plannedMap[iso].push(e);
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    return { plannedMap, availableCountMap };
  }, [myEvents]);

  // Compute scrollTime for the focused date (scrolls to earliest scheduled event)
  const scrollTimeForFocusedDate = useMemo(() => {
    const dayEvents = myEvents.filter(e => {
      const d = parseAPIDate(e.start_date);
      return d && toIsoDate(d) === focusedDate;
    });
    if (dayEvents.length === 0) return '07:30:00';

    let minMinutes = 24 * 60;
    dayEvents.forEach(e => {
      const d = parseAPIDate(e.start_date);
      if (d) {
        const mins = d.getHours() * 60 + d.getMinutes();
        if (mins < minMinutes) minMinutes = mins;
      }
    });
    const targetMins = Math.max(0, minMinutes - 30);
    const hrs = String(Math.floor(targetMins / 60)).padStart(2, '0');
    const mins = String(targetMins % 60).padStart(2, '0');
    return `${hrs}:${mins}:00`;
  }, [myEvents, focusedDate]);

  // Sync FullCalendar date when focusedDate or viewMode changes
  useEffect(() => {
    if (viewMode !== 'overview' && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(focusedDate);
    }
  }, [focusedDate, viewMode]);

  // Initial scroll/focus on first week
  useEffect(() => {
    if (viewMode === 'overview' && firstWeekRef.current) {
      firstWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [viewMode]);

  // Transform events for FullCalendar
  const fcEvents = useMemo(() => {
    const filtered = filterConflictsOnly 
      ? myEvents.filter(e => conflictEventIds.has(e.id))
      : myEvents;

    return filtered.map(event => toFullCalendarEvent(event, conflictEventIds.has(event.id)));
  }, [myEvents, conflictEventIds, filterConflictsOnly]);

  const focusedConflicts = useMemo(() => activeConflictPairs.filter(({ overlapStart, overlapEnd }) => {
    const dayStart = fromIsoDate(focusedDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return overlapStart < dayEnd && overlapEnd > dayStart;
  }), [activeConflictPairs, focusedDate]);

  const totalCost = useMemo(() => myEvents.reduce((acc, curr) => acc + (curr.price || 0), 0), [myEvents]);

  // Cell click handler: set focused date & open single-day timeline grid!
  const handleCellClick = (dateIso) => {
    setFocusedDate(dateIso);
    setViewMode('timeGridDay');
  };

  // Day Navigation Prev/Next
  const handlePrevDay = () => {
    const d = fromIsoDate(focusedDate);
    d.setDate(d.getDate() - 1);
    setFocusedDate(toIsoDate(d));
  };

  const handleNextDay = () => {
    const d = fromIsoDate(focusedDate);
    d.setDate(d.getDate() + 1);
    setFocusedDate(toIsoDate(d));
  };

  // Toggle Conflict Filter Mode
  const handleToggleConflictFilter = () => {
    if (!filterConflictsOnly) {
      setFilterConflictsOnly(true);
      if (conflictDates.length > 0) {
        setConflictIndex(0);
        setFocusedDate(conflictDates[0]);
        setViewMode('timeGridDay');
      }
    } else {
      setFilterConflictsOnly(false);
      setViewMode('overview');
    }
  };

  const handlePrevConflict = () => {
    if (conflictIndex > 0) {
      const nextIdx = conflictIndex - 1;
      setConflictIndex(nextIdx);
      setFocusedDate(conflictDates[nextIdx]);
    }
  };

  const handleNextConflict = () => {
    if (conflictIndex < conflictDates.length - 1) {
      const nextIdx = conflictIndex + 1;
      setConflictIndex(nextIdx);
      setFocusedDate(conflictDates[nextIdx]);
    }
  };

  const focusedDateFormatted = useMemo(() => {
    const d = fromIsoDate(focusedDate);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }, [focusedDate]);

  return (
    <div className="plan-page animate-fade-in">
      {/* Plan Header Summary */}
      <div className="plan-summary-bar">
        <div className="plan-stats-group">
          <div className="stat-card">
            <span className="stat-num">{myEvents.length}</span>
            <span className="stat-label">Events Planned</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">₹{totalCost}</span>
            <span className="stat-label">Total Cost</span>
          </div>
          {activeConflictPairs.length > 0 ? (
            <div className="stat-card warning">
              <span className="stat-num">{activeConflictPairs.length}</span>
              <span className="stat-label">Schedule Conflicts</span>
            </div>
          ) : (
            <div className="stat-card success">
              <span className="stat-num">0</span>
              <span className="stat-label">Conflicts</span>
            </div>
          )}
        </div>

        <div className="plan-actions-group">
          <button className="export-ics-btn" onClick={() => exportEventsToICS(myEvents)}>
            <Download size={16} /> Download Calendar (.ics)
          </button>
          <button className="share-plan-btn" onClick={onSharePlan}>
            <Share2 size={16} /> Share Plan
          </button>
        </div>
      </div>

      {/* Conflict Banner */}
      {activeConflictPairs.length > 0 && (
        <div className="conflict-banner animate-slide-in">
          <div className="conflict-banner-text">
            <AlertTriangle size={20} className="warning-icon" />
            <div>
              <strong>{activeConflictPairs.length} Schedule Conflicts Detected</strong>
              <p>Overlapping events scheduled at the same time.</p>
            </div>
          </div>

          <div className="conflict-controls-group">
            {filterConflictsOnly && conflictDates.length > 1 && (
              <div className="conflict-nav-arrows mono-font">
                <button onClick={handlePrevConflict} disabled={conflictIndex === 0}><ChevronLeft size={16} /></button>
                <span>{conflictIndex + 1} of {conflictDates.length}</span>
                <button onClick={handleNextConflict} disabled={conflictIndex === conflictDates.length - 1}><ChevronRight size={16} /></button>
              </div>
            )}

            <button 
              className={`conflict-filter-toggle ${filterConflictsOnly ? 'active' : ''}`}
              onClick={handleToggleConflictFilter}
            >
              {filterConflictsOnly ? 'Show All Planned Events' : 'Show Conflicts Only'}
            </button>
            <button
              className="ignore-conflict-btn"
              onClick={() => onIgnoreConflict?.(activeConflictPairs[Math.min(conflictIndex, activeConflictPairs.length - 1)]?.key)}
            >
              Ignore this clash
            </button>
          </div>
        </div>
      )}

      {activeConflictPairs.length === 0 && ignoredConflictKeys.length > 0 && (
        <div className="ignored-conflict-note mono-font">
          {ignoredConflictKeys.length} ignored clash{ignoredConflictKeys.length === 1 ? '' : 'es'}
          <button onClick={onRestoreIgnoredConflicts}>Restore warnings</button>
        </div>
      )}

      {/* View Switcher Controls */}
      <div className="calendar-controls-bar">
        <div className="view-mode-tabs">
          <button 
            className={`view-mode-btn ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            <Calendar size={16} /> Festival Overview (Default)
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'timeGridDay' ? 'active' : ''}`}
            onClick={() => setViewMode('timeGridDay')}
          >
            <Clock size={16} /> Day Timeline
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'listWeek' ? 'active' : ''}`}
            onClick={() => setViewMode('listWeek')}
          >
            <List size={16} /> Agenda
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'timeGridWeek' ? 'active' : ''}`}
            onClick={() => setViewMode('timeGridWeek')}
          >
            <Clock size={16} /> Week Timeline
          </button>
        </div>

        {viewMode !== 'overview' && (
          <div className="timeline-header-right">
            {viewMode === 'timeGridDay' && (
              <div className="compact-date-nav mono-font">
                <button onClick={handlePrevDay} title="Previous Day"><ChevronLeft size={16} /></button>
                <span className="focused-date-text">{focusedDateFormatted}</span>
                <button onClick={handleNextDay} title="Next Day"><ChevronRight size={16} /></button>
              </div>
            )}

            <button className="back-overview-btn mono-font" onClick={() => setViewMode('overview')}>
              <ArrowLeft size={14} /> Back to Festival Overview
            </button>
          </div>
        )}
      </div>

      {/* VIEW RENDERER */}
      {viewMode === 'overview' ? (
        <div className="festival-overview-scroll-container">
          <div className="day-name-headers mono-font">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          <div className="weeks-grid-wrapper">
            {festivalWeeks.map((week, weekIdx) => (
              <div 
                key={week.weekId} 
                className="week-row-block"
                ref={weekIdx === 0 ? firstWeekRef : null}
              >
                {week.monthHeader && (
                  <div className="sticky-month-divider mono-font">
                    {week.monthHeader}
                  </div>
                )}

                <div className="week-days-grid">
                  {week.days.map((day) => {
                    const plannedList = eventsByDate.plannedMap[day.dateIso] || [];
                    const availCount = eventsByDate.availableCountMap[day.dateIso] || 0;
                    const hasConflict = conflictDateSet.has(day.dateIso);

                    return (
                      <div 
                        key={day.dateIso}
                        className={`overview-day-cell ${day.isMainWeekend ? 'main-weekend-cell' : ''} ${hasConflict ? 'has-conflict' : ''}`}
                        onClick={() => handleCellClick(day.dateIso)}
                      >
                        <div className="cell-top">
                          <span className="cell-date-num mono-font">{day.dayNum}</span>
                          {hasConflict ? (
                            <span className="cell-conflict-badge mono-font" title="There is a schedule conflict on this date">1 clash</span>
                          ) : day.isMainWeekend && (
                            <span className="cell-fest-badge mono-font">★ MAIN FEST</span>
                          )}
                        </div>

                        {/* Planned Event Chips */}
                        <div className="cell-chips-list">
                          {plannedList.map(event => (
                            <div 
                              key={event.id}
                              className="event-chip mono-font"
                              style={{ borderLeftColor: getTypeColor(event.type) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEventDetail(event);
                              }}
                            >
                              {event.name}
                            </div>
                          ))}
                        </div>

                        {/* Subtle Available Events Count */}
                        {availCount > 0 && (
                          <div className="cell-avail-hint mono-font">
                            {hasConflict ? 'Tap to compare times' : `${availCount} available`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FullCalendar Engine for Day Timeline, Agenda & Week Timeline */
        <div className="fullcalendar-wrapper">
          {viewMode === 'timeGridDay' && focusedConflicts.map(({ eventA, eventB, overlapStart, overlapEnd }, index) => (
            <div className="conflict-timeline-header mono-font">
              <AlertTriangle size={16} />
              <span>
                Clash: {eventA.name} × {eventB.name} · {overlapStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}–{overlapEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))}

          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={viewMode}
            initialDate={focusedDate}
            scrollTime={scrollTimeForFocusedDate}
            headerToolbar={false}
            events={fcEvents}
            eventContent={(eventInfo) => {
              const { isMultiDay, isConflict } = eventInfo.event.extendedProps;
              return (
                <div className={`fc-custom-event-card ${isMultiDay ? 'is-multiday' : ''}`}>
                  <div className="fc-card-top">
                    {isConflict && <span className="fc-clash-badge mono-font">Clash</span>}
                    <span className="fc-card-title">{eventInfo.event.title}</span>
                  </div>
                  {eventInfo.timeText && (
                    <span className="fc-card-time mono-font">{eventInfo.timeText}</span>
                  )}
                </div>
              );
            }}
            eventClick={(info) => {
              const found = myEvents.find(e => String(e.id) === String(info.event.id));
              if (found) onSelectEventDetail(found);
            }}
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            dayHeaderFormat={{ weekday: 'long', month: 'short', day: 'numeric' }}
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            height="100%"
            eventOverlap={true}
            allDaySlot={false}
            editable={false}
          />
        </div>
      )}
    </div>
  );
}
