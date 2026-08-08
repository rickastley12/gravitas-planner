import React, { useState } from 'react';
import './Header.css';
import { Search, Compass, CalendarCheck, HelpCircle, SlidersHorizontal, Share2, ExternalLink, X, Ticket } from 'lucide-react';
import rawEvents from '../data/events_scored.json';

function GithubMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.1 3.29 9.4 7.86 10.94.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"/>
    </svg>
  );
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  searchQuery, 
  setSearchQuery, 
  selectedType, 
  setSelectedType, 
  sortMode, 
  setSortMode, 
  planCount,
  onOpenPersonalize,
  onOpenFAQ,
  onSharePlan
}) {
  const EVENT_TYPES = ['All Types', 'Competition', 'Workshop', 'Hackathon', 'Entrepreneurship and Management', 'Others'];
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  return (
    <>
      <header className="app-header-top">
        <div className="header-top-row">
          <div className="brand-col">
            <div className="brand-logo" onClick={() => setActiveTab('explore')}>
              <span className="brand-name">GRAVITAS</span>
              <span className="brand-sub">PLANNER</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`}
              onClick={() => setActiveTab('explore')}
            >
              <Compass size={16} /> Explore events
            </button>

            <button 
              className={`nav-tab ${activeTab === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('plan')}
            >
              <CalendarCheck size={16} /> My plan
              {planCount > 0 && <span className="plan-count-pill mono-font">({String(planCount).padStart(2, '0')})</span>}
            </button>
          </div>

          <div className="header-actions">
            <button className="icon-action-btn register-action-btn mono-font" onClick={() => setShowRegistrationModal(true)}>
              <Ticket size={14} /> Register
            </button>

            <button className="icon-action-btn mono-font" onClick={onOpenPersonalize} title="Personalize your recommendations">
              <SlidersHorizontal size={14} /> Personalize
            </button>

            <button className="icon-action-btn mono-font" onClick={onSharePlan} title="Share Plan Link">
              <Share2 size={14} /> Share
            </button>

            <button className="icon-action-btn mono-font" onClick={onOpenFAQ} title="FAQ & Data Guide">
              <HelpCircle size={16} /> FAQ
            </button>

            <a
              className="icon-action-btn mono-font github-link-btn"
              href="https://github.com/rickastley12/gravitas-planner"
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
            >
              <GithubMark size={16} />
            </a>
          </div>
        </div>
      </header>

      {/* Filter Rail */}
      {activeTab === 'explore' && (
        <div className="header-filter-bar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder={`Search ${rawEvents.length} events, clubs, venues...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mono-font"
            />
          </div>

          <div className="type-chips">
            {EVENT_TYPES.map(type => (
              <button 
                key={type}
                className={`type-chip mono-font ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="sort-box mono-font">
            <SlidersHorizontal size={13} />
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="relevance">Best match</option>
              <option value="soonest">Soonest date</option>
              <option value="free">Free first</option>
              <option value="shortest">Shortest duration</option>
            </select>
          </div>
        </div>
      )}

      {showRegistrationModal && (
        <div className="registration-overlay" role="presentation" onClick={() => setShowRegistrationModal(false)}>
          <section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title" onClick={(event) => event.stopPropagation()}>
            <button className="registration-close" onClick={() => setShowRegistrationModal(false)} aria-label="Close registration options">
              <X size={20} />
            </button>
            <h2 id="registration-title" className="mono-font">REGISTRATION TYPE</h2>
            <a className="registration-link mono-font" href="https://vconnect.vit.ac.in/vtopconnect/login" target="_blank" rel="noopener noreferrer">
              VIT Student (Internal) <ExternalLink size={20} />
            </a>
            <a className="registration-link mono-font" href="https://web.vit.ac.in/gravitasexternal/login" target="_blank" rel="noopener noreferrer">
              Non-VIT Participant (External) <ExternalLink size={20} />
            </a>
          </section>
        </div>
      )}
    </>
  );
}
