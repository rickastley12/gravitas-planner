import React from 'react';
import './FAQModal.css';
import { X, HelpCircle, Database, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export default function FAQModal({ onClose }) {
  return (
    <div className="faq-overlay" onClick={onClose}>
      <div className="faq-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="faq-header">
          <div className="faq-title-row">
            <HelpCircle size={22} className="faq-icon" />
            <h3>Gravitas '26 Planner — FAQ & Data Guide</h3>
          </div>
          <button className="faq-close-btn" onClick={onClose} aria-label="Close FAQ">
            <X size={18} />
          </button>
        </div>

        <div className="faq-body">
          <div className="faq-item">
            <h4><Sparkles size={16} /> How are recommendations calculated?</h4>
            <p>
              We calculate personalized match scores based on your <strong>ranked technical interests</strong> (Primary, Secondary, Tertiary). 
              Our recommendation matrix evaluates each event's core focus, organizing club history, and event type. Every card shows a transparent breakdown like <code>92% match · AI 70 · Web 18</code> so you know exactly why an event was ranked.
            </p>
          </div>

          <div className="faq-item">
            <h4><Database size={16} /> Where does this data come from?</h4>
            <p>
              Event details (dates, venues, club hosts, ticket prices, team sizes) are fetched directly from the official <strong>VIT Gravitas API dataset</strong> (137 events index).
            </p>
          </div>

          <div className="faq-item">
            <h4><ShieldAlert size={16} /> Does this automatically register me for events?</h4>
            <p>
              <strong>No.</strong> This application is an independent student planning companion. To complete official registration and payments, click the <strong>"Official Registration"</strong> link on any event card to open the VIT portal.
            </p>
          </div>

          <div className="faq-item">
            <h4><RefreshCw size={16} /> Data Verification Notice</h4>
            <p className="disclaimer-text">
              Event venues and slot times may be adjusted by organizing clubs leading up to Gravitas. Always double-check timings on the official Gravitas portal before attending.
            </p>
          </div>
        </div>

        <div className="faq-footer">
          <span>Dataset Version: <code>v1.4 • 137 Events Index</code></span>
          <button className="faq-done-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
