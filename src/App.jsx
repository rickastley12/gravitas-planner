import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import rawEvents from './data/events_scored.json';
import { sortEventsByScore } from './utils/scoring';
import Header from './components/Header';
import EventExplorer from './components/EventExplorer';
import CalendarView from './components/CalendarView';
import InterestQuiz from './components/InterestQuiz';
import EventDetailSheet from './components/EventDetailSheet';
import FAQModal from './components/FAQModal';
import { Sparkles } from 'lucide-react';

const getConflictKey = (eventA, eventB) => [String(eventA.id), String(eventB.id)].sort().join('::');

export default function App() {
  // Storage & Navigation State
  const [rankedInterests, setRankedInterests] = useState(() => {
    try {
      const saved = localStorage.getItem('gravitas_ranked_interests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [primaryGoal, setPrimaryGoal] = useState(() => {
    try {
      return localStorage.getItem('gravitas_primary_goal') || 'build';
    } catch {
      return 'build';
    }
  });

  const [selectedEvents, setSelectedEvents] = useState(() => {
    let parsedIds = [];
    try {
      if (window.location.hash.startsWith('#plan=')) {
        parsedIds = window.location.hash.replace('#plan=', '').split(',').map(s => decodeURIComponent(s).trim()).filter(Boolean);
      } else {
        const saved = localStorage.getItem('gravitas_my_events');
        parsedIds = saved ? JSON.parse(saved) : [];
      }
    } catch {
      parsedIds = [];
    }
    const validIds = new Set(rawEvents.map(e => String(e.id)));
    const cleaned = Array.isArray(parsedIds) ? parsedIds.map(String).filter(id => validIds.has(id)) : [];
    try {
      localStorage.setItem('gravitas_my_events', JSON.stringify(cleaned));
    } catch {
      // Ignore quota errors
    }
    return cleaned;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const hasSetup = localStorage.getItem('gravitas_setup_done');
    return hasSetup ? 'explore' : 'onboarding';
  });

  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [ignoredConflictKeys, setIgnoredConflictKeys] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gravitas_ignored_conflicts') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [sortMode, setSortMode] = useState('relevance');

  // Modals & Detail Side Sheet State
  const [inspectingEvent, setInspectingEvent] = useState(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Persist storage
  useEffect(() => {
    localStorage.setItem('gravitas_ranked_interests', JSON.stringify(rankedInterests));
  }, [rankedInterests]);

  useEffect(() => {
    localStorage.setItem('gravitas_primary_goal', primaryGoal);
  }, [primaryGoal]);

  useEffect(() => {
    localStorage.setItem('gravitas_my_events', JSON.stringify(selectedEvents));
  }, [selectedEvents]);

  useEffect(() => {
    localStorage.setItem('gravitas_ignored_conflicts', JSON.stringify(ignoredConflictKeys));
  }, [ignoredConflictKeys]);

  // Compute Scored Events Stream
  const scoredEvents = useMemo(() => {
    let result = sortEventsByScore(rawEvents, rankedInterests, sortMode);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.name?.toLowerCase().includes(q) || 
        e.club?.toLowerCase().includes(q) || 
        e.venue?.toLowerCase().includes(q)
      );
    }

    if (selectedType !== 'All Types') {
      result = result.filter(e => e.type === selectedType);
    }

    return result;
  }, [rankedInterests, sortMode, searchQuery, selectedType]);

  // My Planned Events & Conflict Count
  const myPlannedEvents = useMemo(() => {
    return rawEvents.filter(e => selectedEvents.includes(e.id));
  }, [selectedEvents]);

  const conflictPairsCount = useMemo(() => {
    let count = 0;
    const n = myPlannedEvents.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const startA = new Date(myPlannedEvents[i].start_date.replace(/Z$/, ''));
        const endA = myPlannedEvents[i].end_date ? new Date(myPlannedEvents[i].end_date.replace(/Z$/, '')) : new Date(startA.getTime() + 2 * 3600 * 1000);
        const startB = new Date(myPlannedEvents[j].start_date.replace(/Z$/, ''));
        const endB = myPlannedEvents[j].end_date ? new Date(myPlannedEvents[j].end_date.replace(/Z$/, '')) : new Date(startB.getTime() + 2 * 3600 * 1000);
        if (startA < endB && endA > startB && !ignoredConflictKeys.includes(getConflictKey(myPlannedEvents[i], myPlannedEvents[j]))) count++;
      }
    }
    return count;
  }, [myPlannedEvents, ignoredConflictKeys]);

  const [lastRemovedEvent, setLastRemovedEvent] = useState(null);
  const removeToastTimerRef = useRef(null);

  // Handlers
  const handleTogglePlan = (eventId) => {
    setSelectedEvents(prev => {
      const exists = prev.includes(eventId);
      const updated = exists ? prev.filter(id => id !== eventId) : [...prev, eventId];
      return updated;
    });
  };

  const handleRemoveEventWithToast = (event) => {
    setSelectedEvents(prev => prev.filter(id => id !== event.id));
    setLastRemovedEvent(event);

    if (removeToastTimerRef.current) clearTimeout(removeToastTimerRef.current);
    removeToastTimerRef.current = setTimeout(() => {
      setLastRemovedEvent(null);
    }, 5000);
  };

  const handleUndoRemoval = () => {
    if (lastRemovedEvent) {
      setSelectedEvents(prev => [...prev, lastRemovedEvent.id]);
      setLastRemovedEvent(null);
      if (removeToastTimerRef.current) clearTimeout(removeToastTimerRef.current);
    }
  };

  const handleIgnoreConflict = (conflictKey) => {
    setIgnoredConflictKeys(previous => previous.includes(conflictKey) ? previous : [...previous, conflictKey]);
    showToast('Clash ignored. Both events remain in your plan.');
  };

  const handleRestoreIgnoredConflicts = () => {
    setIgnoredConflictKeys([]);
    showToast('Ignored clashes restored.');
  };

  const handleSavePreferences = (interests, goal) => {
    setRankedInterests(interests);
    if (goal) setPrimaryGoal(goal);
    localStorage.setItem('gravitas_setup_done', 'true');
    setShowPreferencesModal(false);
    if (activeTab === 'onboarding') setActiveTab('explore');
    showToast('Preferences updated! Stream re-ranked.');
  };

  const handleSharePlan = () => {
    if (selectedEvents.length === 0) {
      showToast('Add some events to your plan first!');
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}#plan=${selectedEvents.join(',')}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Plan link copied to clipboard!');
    }).catch(() => {
      showToast(`Shareable Link: ${shareUrl}`);
    });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="app-root">
      {lastRemovedEvent && (
        <div className="toast-notification animate-slide-in mono-font">
          <span>Removed <strong>{lastRemovedEvent.name}</strong> from plan.</span>
          <button 
            className="undo-toast-btn"
            onClick={handleUndoRemoval}
          >
            UNDO
          </button>
        </div>
      )}

      {toastMessage && !lastRemovedEvent && (
        <div className="toast-notification animate-slide-in mono-font">
          <Sparkles size={16} /> {toastMessage}
        </div>
      )}

      {activeTab === 'onboarding' ? (
        <InterestQuiz 
          initialInterests={rankedInterests}
          initialGoal={primaryGoal}
          mode="onboarding"
          onComplete={handleSavePreferences}
          onSkip={() => {
            localStorage.setItem('gravitas_setup_done', 'true');
            setActiveTab('explore');
          }}
        />
      ) : (
        <>
          <Header 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            sortMode={sortMode}
            setSortMode={setSortMode}
            planCount={myPlannedEvents.length}
            onOpenPersonalize={() => setShowPreferencesModal(true)}
            onOpenFAQ={() => setShowFAQ(true)}
            onSharePlan={handleSharePlan}
          />

          <main className="main-content">
            {activeTab === 'explore' ? (
              <EventExplorer 
                events={scoredEvents}
                selectedEvents={selectedEvents}
                myEvents={myPlannedEvents}
                conflictPairsCount={conflictPairsCount}
                ignoredConflictKeys={ignoredConflictKeys}
                onIgnoreConflict={handleIgnoreConflict}
                sortMode={sortMode}
                onTogglePlan={handleTogglePlan}
                onRemoveEventWithToast={handleRemoveEventWithToast}
                onSelectEventDetail={setInspectingEvent}
                onOpenFullPlan={() => setActiveTab('plan')}
              />
            ) : (
              <CalendarView 
                myEvents={myPlannedEvents}
                onRemoveEvent={(id) => handleTogglePlan(id)}
                onSelectEventDetail={setInspectingEvent}
                onSharePlan={handleSharePlan}
                ignoredConflictKeys={ignoredConflictKeys}
                onIgnoreConflict={handleIgnoreConflict}
                onRestoreIgnoredConflicts={handleRestoreIgnoredConflicts}
              />
            )}
          </main>
        </>
      )}

      {/* Side Sheet Details Modal */}
      {inspectingEvent && (
        <EventDetailSheet 
          event={inspectingEvent}
          onClose={() => setInspectingEvent(null)}
          isSelected={selectedEvents.includes(inspectingEvent.id)}
          onTogglePlan={handleTogglePlan}
        />
      )}

      {/* FAQ Modal */}
      {showFAQ && (
        <FAQModal onClose={() => setShowFAQ(false)} />
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <InterestQuiz 
          initialInterests={rankedInterests}
          initialGoal={primaryGoal}
          mode="edit"
          onComplete={handleSavePreferences}
          onClose={() => setShowPreferencesModal(false)}
        />
      )}
    </div>
  );
}
