import React from 'react';
import { getTierColor, getTypeColor, formatEventTime } from '../utils/scoring';
import './EventExplorer.css'; // Reuse styles

export default function EventCardDragOverlay({ event }) {
  const tierColor = getTierColor(event.tier);

  return (
    <div className="event-card" style={{ opacity: 0.9, cursor: 'grabbing', boxShadow: 'var(--shadow-elevated)', transform: 'rotate(2deg)' }}>
      <div className="event-card-content">
        <div className="event-card-header">
          <div className="title-row">
            <h4>{event.name}</h4>
            {event.userScore > 0 && (
              <span className="match-badge" style={{ color: tierColor, backgroundColor: `${tierColor}15`, border: `1px solid ${tierColor}40` }}>
                {event.tier === 'S' ? '🔥 ' : event.tier === 'A' ? '⭐ ' : ''}{Math.round(event.userScore)}% Match
              </span>
            )}
          </div>
          <span className="event-club">{event.club}</span>
        </div>
        <div className="event-tags">
          <span className="tag type-tag" style={{ color: getTypeColor(event.type), borderColor: getTypeColor(event.type) }}>
            {event.type}
          </span>
          {event.start_date && (
            <span className="tag time-tag">
              🕒 {formatEventTime(event.start_date, event.end_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
