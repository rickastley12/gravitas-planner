import React, { useState, useEffect, useMemo, useRef } from 'react';
import './CalendarWorkspace.css';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { toFullCalendarEvent, parseAPIDate, formatEventTime, getTypeColor } from '../utils/scoring';
import { exportEventsToICS } from '../utils/exportICS';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Check, 
  Download, 
  Share2, 
  AlertTriangle, 
  Building, 
  MapPin, 
  Calendar as CalendarIcon, 
  DollarSign, 
  ExternalLink,
  GripVertical,
  HelpCircle
} from 'lucide-react';

export default function CalendarWorkspace({ 
  rawEvents = [], 
  scoredEvents = [], 
  selectedEvents = [], 
  onTogglePlan, 
  onSelectEventDetail,
  onOpenFAQ,
  onSharePlan
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const calendarRef = useRef(null);
  const draggableContainerRef = useRef(null);

  // Extract unique sorted dates dynamically from event dataset
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    rawEvents.forEach(e => {
      const d = parseAPIDate(e.start_date);
      if (d) datesSet.add(d.toISOString().split('T')[0]);
    });
    return Array.from(datesSet).sort();
  }, [rawEvents]);

  const activeDateIso = availableDates[currentDateIndex] || availableDates[0] || '2026-08-28';

  // Planned Event objects
  const plannedEvents = useMemo(() => {
    return rawEvents.filter(e => selectedEvents.includes(e.id));
  }, [rawEvents, selectedEvents]);

  // Compute Schedule Conflict Pairs
  const conflictPairs = useMemo(() => {
    const pairs = [];
    const n = plannedEvents.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const eventA = plannedEvents[i];
        const eventB = plannedEvents[j];

        const startA = parseAPIDate(eventA.start_date);
        const endA = parseAPIDate(eventA.end_date) || new Date(startA.getTime() + 2 * 3600 * 1000);
        const startB = parseAPIDate(eventB.start_date);
        const endB = parseAPIDate(eventB.end_date) || new Date(startB.getTime() + 2 * 3600 * 1000);

        if (startA && startB && startA < endB && endA > startB) {
          pairs.push({ eventA, eventB });
        }
      }
    }

    return pairs;
  }, [plannedEvents]);

  const conflictEventIds = useMemo(() => {
    const ids = new Set();
    conflictPairs.forEach(({ eventA, eventB }) => {
      ids.add(eventA.id);
      ids.add(eventB.id);
    });
    return ids;
  }, [conflictPairs]);

  // Filter catalogue events for Left Panel (filtered by date/search/type)
  const catalogueEvents = useMemo(() => {
    return scoredEvents.filter(e => {
      const d = parseAPIDate(e.start_date);
      const dateIso = d ? d.toISOString().split('T')[0] : '';
      
      // Match active date
      if (dateIso !== activeDateIso) return false;

      // Match search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = e.name?.toLowerCase().includes(q) ||
                        e.club?.toLowerCase().includes(q) ||
                        e.venue?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Match type
      if (selectedType !== 'All Types' && e.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [scoredEvents, activeDateIso, searchQuery, selectedType]);

  // Transform planned events to FullCalendar event format
  const fcEvents = useMemo(() => {
    return plannedEvents.map(event => toFullCalendarEvent(event, conflictEventIds.has(event.id)));
  }, [plannedEvents, conflictEventIds]);

  // Setup FullCalendar External Draggable for Left Panel cards
  useEffect(() => {
    let draggableInstance = null;
    if (draggableContainerRef.current) {
      draggableInstance = new Draggable(draggableContainerRef.current, {
        itemSelector: '.draggable-card',
        eventData: function(eventEl) {
          return {
            id: eventEl.dataset.id,
            title: eventEl.dataset.title
          };
        }
      });
    }

    return () => {
      if (draggableInstance) draggableInstance.destroy();
    };
  }, [catalogueEvents]);

  // Navigation handlers
  const handlePrevDate = () => {
    if (currentDateIndex > 0) {
      const nextIdx = currentDateIndex - 1;
      setCurrentDateIndex(nextIdx);
      const targetDate = availableDates[nextIdx];
      if (calendarRef.current && targetDate) {
        calendarRef.current.getApi().gotoDate(targetDate);
      }
    }
  };

  const handleNextDate = () => {
    if (currentDateIndex < availableDates.length - 1) {
      const nextIdx = currentDateIndex + 1;
      setCurrentDateIndex(nextIdx);
      const targetDate = availableDates[nextIdx];
      if (calendarRef.current && targetDate) {
        calendarRef.current.getApi().gotoDate(targetDate);
      }
    }
  };

  const handleCalendarEventClick = (clickInfo) => {
    const eventId = clickInfo.event.id;
    const found = rawEvents.find(e => String(e.id) === String(eventId));
    if (found) {
      onSelectEventDetail(found);
    }
  };

  const handleDropOnCalendar = (dropInfo) => {
    const eventId = dropInfo.event.id;
    if (eventId && !selectedEvents.includes(eventId)) {
      onTogglePlan(eventId);
    }
    dropInfo.event.remove(); // Handled by React state
  };

  const activeDateFormatted = useMemo(() => {
    if (!activeDateIso) return 'All Dates';
    const dateObj = new Date(activeDateIso);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [activeDateIso]);

  const totalCost = useMemo(() => plannedEvents.reduce((acc, curr) => acc + (curr.price || 0), 0), [plannedEvents]);

  return (
    <div className="workspace-container">
      {/* TOP BAR */}
      <header className="workspace-top-bar">
        <div className="bar-left-group">
          <div className="app-brand" onClick={() => setCurrentDateIndex(0)}>
            GRAVITAS <span className="brand-sub">PLANNER</span>
          </div>

          {/* Compact Date Navigator */}
          <div className="date-navigator mono-font">
            <button 
              className="nav-arrow-btn" 
              onClick={handlePrevDate} 
              disabled={currentDateIndex === 0}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="current-date-label">{activeDateFormatted}</span>
            <button 
              className="nav-arrow-btn" 
              onClick={handleNextDate} 
              disabled={currentDateIndex === availableDates.length - 1}
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bar-center-group">
          {/* Search Input */}
          <div className="workspace-search">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search events, clubs, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mono-font"
            />
          </div>

          {/* Type Filter */}
          <select 
            className="type-select mono-font"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="All Types">All Types</option>
            <option value="Competition">Competition</option>
            <option value="Workshop">Workshop</option>
            <option value="Hackathon">Hackathon</option>
            <option value="Entrepreneurship and Management">Entrepreneurship</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div className="bar-right-group">
          {/* Plan Count Summary */}
          <div className="plan-summary-badge mono-font">
            MY PLAN: {selectedEvents.length} ({`₹${totalCost}`})
          </div>

          {conflictPairs.length > 0 && (
            <div className="conflict-badge mono-font" title={`${conflictPairs.length} Overlapping Events`}>
              <AlertTriangle size={14} /> {conflictPairs.length} CLASH
            </div>
          )}

          <button className="action-btn mono-font" onClick={() => exportEventsToICS(plannedEvents)} title="Download .ics">
            <Download size={14} /> Export .ics
          </button>

          <button className="action-btn mono-font" onClick={onSharePlan} title="Share Link">
            <Share2 size={14} /> Share
          </button>

          <button className="action-btn mono-font" onClick={onOpenFAQ} title="FAQ & Help">
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="workspace-split-body">
        {/* LEFT PANEL (38%): Event Catalogue */}
        <aside className="catalogue-panel">
          <div className="panel-header">
            <h3>Event Catalogue</h3>
            <span className="panel-subtitle mono-font">
              {catalogueEvents.length} events on {activeDateFormatted} · Drag card to calendar
            </span>
          </div>

          <div className="catalogue-scroll" ref={draggableContainerRef} id="external-events-list">
            {catalogueEvents.length === 0 ? (
              <div className="empty-panel mono-font">
                No events found for this day & filter criteria.
              </div>
            ) : (
              catalogueEvents.map(event => {
                const isAdded = selectedEvents.includes(event.id);
                const isGoodMatch = (event.matchPercentage || 0) >= 70;
                const matchTopics = event.relevanceBreakdown ? event.relevanceBreakdown[0] : null;

                return (
                  <div 
                    key={event.id}
                    className={`draggable-card ${isAdded ? 'added-to-plan' : ''}`}
                    data-id={event.id}
                    data-title={event.name}
                    onClick={() => onSelectEventDetail(event)}
                  >
                    <div className="drag-handle">
                      <GripVertical size={14} />
                    </div>

                    <div className="card-content">
                      <div className="card-top-meta">
                        <span className="type-tag mono-font">{event.type || 'Event'}</span>
                        {isGoodMatch && (
                          <span className="good-match-tag mono-font">
                            Good match {matchTopics ? `· ${matchTopics}` : ''}
                          </span>
                        )}
                      </div>

                      <h4 className="card-title">{event.name}</h4>

                      <div className="card-details mono-font">
                        <span><Building size={11} /> {event.club}</span>
                        <span><CalendarIcon size={11} /> {formatEventTime(event.start_date, event.end_date)}</span>
                        <span><MapPin size={11} /> {event.venue || 'TBA'}</span>
                        <span><DollarSign size={11} /> {event.price === 0 ? 'Free' : `₹${event.price}`}</span>
                      </div>
                    </div>

                    <button 
                      className={`add-btn ${isAdded ? 'is-added' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlan(event.id);
                      }}
                      title={isAdded ? 'Remove from plan' : 'Add to plan'}
                    >
                      {isAdded ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANEL (62%): Central FullCalendar Planner */}
        <main className="calendar-panel">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate={activeDateIso}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay,listWeek'
            }}
            events={fcEvents}
            eventClick={handleCalendarEventClick}
            droppable={true}
            eventReceive={handleDropOnCalendar}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            height="100%"
            eventOverlap={true}
            editable={false}
          />
        </main>
      </div>
    </div>
  );
}
