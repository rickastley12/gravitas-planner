import React from 'react';
import './EventDetailSheet.css';
import { getTypeColor, formatEventTime, getDurationSemantics } from '../utils/scoring';
import { X, Calendar, MapPin, Building, Users, DollarSign, ExternalLink, Trash2, Plus, Sparkles } from 'lucide-react';

export default function EventDetailSheet({ event, onClose, isSelected, onTogglePlan }) {
  if (!event) return null;

  const durationSemantics = getDurationSemantics(event);
  const typeColor = getTypeColor(event.type);
  const officialUrl = event.official_url || event.registration_url || `https://gravitas.vit.ac.in/events/${event.id}`;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-container animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close-btn" onClick={onClose} aria-label="Close details">
          <X size={20} />
        </button>

        <div className="sheet-header">
          <div className="sheet-tags">
            <span className="sheet-tag" style={{ color: typeColor, borderColor: typeColor, backgroundColor: `${typeColor}15` }}>
              {event.type || 'Event'}
            </span>
            {event.matchPercentage && (
              <span className="sheet-match-badge">
                <Sparkles size={14} /> {event.matchPercentage}% Match
              </span>
            )}
          </div>
          
          <h2 className="sheet-title">{event.name}</h2>
          <p className="sheet-club"><Building size={14} /> {event.club || 'VIT Student Club'}</p>
        </div>

        {/* Relevance Explanation */}
        {event.relevanceBreakdown && event.relevanceBreakdown.length > 0 && (
          <div className="sheet-relevance-box">
            <h4><Sparkles size={14} /> Why this matches you</h4>
            <div className="relevance-pills">
              {event.relevanceBreakdown.map((item, idx) => (
                <span key={idx} className="relevance-pill">{item}</span>
              ))}
            </div>
          </div>
        )}

        <div className="sheet-body">
          <div className="sheet-info-grid">
            <div className="info-item">
              <Calendar className="info-icon" size={18} />
              <div>
                <span className="info-label">Date & Time</span>
                <span className="info-val">{formatEventTime(event.start_date, event.end_date)}</span>
              </div>
            </div>

            <div className="info-item">
              <MapPin className="info-icon" size={18} />
              <div>
                <span className="info-label">Venue</span>
                <span className="info-val">{event.venue || 'TBA'}</span>
              </div>
            </div>

            <div className="info-item">
              <DollarSign className="info-icon" size={18} />
              <div>
                <span className="info-label">Price</span>
                <span className="info-val">{event.price === 0 ? 'Free' : `₹${event.price}`}</span>
              </div>
            </div>

            <div className="info-item">
              <Users className="info-icon" size={18} />
              <div>
                <span className="info-label">Team Size & Duration</span>
                <span className="info-val">{event.team_size || 'Individual'} • {durationSemantics.hoursLabel}</span>
              </div>
            </div>
          </div>

          {event.short_description && (
            <div className="sheet-desc">
              <h4>About the Event</h4>
              <p>{event.short_description}</p>
            </div>
          )}

          <div className="sheet-disclaimer">
            ⚠️ <em>Data may change. Always verify dates & room numbers on the official VIT Gravitas portal.</em>
          </div>
        </div>

        <div className="sheet-actions">
          <button 
            className={`sheet-plan-btn ${isSelected ? 'selected' : ''}`}
            onClick={() => onTogglePlan(event.id)}
          >
            {isSelected ? (
              <>
                <Trash2 size={16} /> Remove from My Plan
              </>
            ) : (
              <>
                <Plus size={16} /> Add to My Plan
              </>
            )}
          </button>

          <a 
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sheet-official-link"
          >
            Official Registration <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
