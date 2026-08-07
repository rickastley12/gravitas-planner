import React, { useState } from 'react';
import './Header.css';
import { Search, Compass, CalendarCheck, HelpCircle, SlidersHorizontal, Share2, ExternalLink, X, Ticket } from 'lucide-react';

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
    <header className="app-header">
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
        </div>
      </div>

      {/* Filter Rail */}
      {activeTab === 'explore' && (
        <div className="header-filter-bar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search 137 events, clubs, venues..." 
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
    </header>
  );
}
