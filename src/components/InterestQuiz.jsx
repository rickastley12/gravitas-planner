import React, { useState } from 'react';
import './InterestQuiz.css';
import { INTEREST_CATEGORIES } from '../data/interests';
import { Sparkles, ArrowRight, CheckCircle2, Shuffle, Terminal, Award, BookOpen, Users, Compass, X } from 'lucide-react';

const GOAL_OPTIONS = [
  { id: 'build', label: 'Build & Hack', icon: Terminal, desc: 'Hackathons, 24/36h coding marathons, rapid prototyping' },
  { id: 'compete', label: 'Compete & Win', icon: Award, desc: 'Competitions, CTFs, quizzes, prize pool challenges' },
  { id: 'learn', label: 'Learn & Upskill', icon: BookOpen, desc: 'Workshops, expert tech talks, hands-on kits' },
  { id: 'socialize', label: 'Socialize & Network', icon: Users, desc: 'Club meetups, entrepreneurship pitches, fun events' },
  { id: 'explore', label: 'Explore Everything', icon: Compass, desc: 'A balanced mix of all Gravitas tracks' },
];

export default function InterestQuiz({ 
  initialInterests = [], 
  initialGoal = 'build', 
  mode = 'onboarding',
  onComplete, 
  onClose,
  onSkip 
}) {
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(initialGoal);
  const [rankedInterests, setRankedInterests] = useState(initialInterests);

  const isEditMode = mode === 'edit';

  const toggleInterest = (catId) => {
    if (rankedInterests.some(item => item.id === catId)) {
      const filtered = rankedInterests.filter(item => item.id !== catId);
      setRankedInterests(filtered.map((item, idx) => ({ ...item, rank: idx + 1 })));
    } else {
      if (rankedInterests.length >= 5) return;
      setRankedInterests([...rankedInterests, { id: catId, rank: rankedInterests.length + 1 }]);
    }
  };

  const handleFinish = () => {
    const finalInterests = rankedInterests.length > 0 
      ? rankedInterests 
      : [{ id: 'ai_ml', rank: 1 }, { id: 'webdev', rank: 2 }, { id: 'hackathons', rank: 3 }];
    onComplete(finalInterests, selectedGoal);
  };

  return (
    <div className={`onboarding-page animate-fade-in ${isEditMode ? 'modal-backdrop' : ''}`}>
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="brand-badge mono-font">
            {isEditMode ? 'PERONSALIZE PREFERENCES' : "GRAVITAS '26 / EVENT PLANNER"}
          </div>

          <div className="header-right-group">
            <div className="step-indicator mono-font">
              <span className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</span>
              <span className="step-line"></span>
              <span className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</span>
            </div>

            {isEditMode && onClose && (
              <button className="close-modal-btn" onClick={onClose} aria-label="Close preferences">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {step === 1 ? (
          <div className="step-content animate-slide-in">
            <h1 className="onboarding-title">
              {isEditMode ? 'Personalize your recommendations' : "What do you want from Gravitas '26?"}
            </h1>
            <p className="onboarding-subtitle mono-font">
              Select your primary goal to structure your custom event recommendations.
            </p>

            <div className="goals-grid">
              {GOAL_OPTIONS.map(goal => {
                const IconComponent = goal.icon;
                const isSelected = selectedGoal === goal.id;

                return (
                  <div 
                    key={goal.id} 
                    className={`goal-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedGoal(goal.id)}
                  >
                    <div className="goal-icon-wrapper">
                      <IconComponent size={22} />
                    </div>
                    <div className="goal-info">
                      <h3>{goal.label}</h3>
                      <p>{goal.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="check-icon" />}
                  </div>
                );
              })}
            </div>

            <div className="onboarding-actions">
              {isEditMode ? (
                <button className="secondary-btn mono-font" onClick={onClose}>
                  Cancel
                </button>
              ) : (
                <button className="secondary-btn mono-font" onClick={onSkip}>
                  <Shuffle size={14} /> SHOW EVERYTHING ANYWAY
                </button>
              )}

              <button className="primary-btn mono-font" onClick={() => setStep(2)}>
                NEXT: SELECT TECH TRACKS <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="step-content animate-slide-in">
            <h1 className="onboarding-title">
              {isEditMode ? 'Rank your tech interests' : 'Choose and rank your tech interests'}
            </h1>
            <p className="onboarding-subtitle mono-font">
              Select in order of priority (1 = Primary, 2 = Secondary, 3 = Tertiary). Lower ranked events remain 100% visible!
            </p>

            <div className="interests-grid">
              {INTEREST_CATEGORIES.map(cat => {
                const foundIdx = rankedInterests.findIndex(item => item.id === cat.id);
                const isRanked = foundIdx !== -1;
                const rankNum = isRanked ? foundIdx + 1 : null;

                return (
                  <div 
                    key={cat.id} 
                    className={`interest-card ${isRanked ? 'ranked' : ''}`}
                    onClick={() => toggleInterest(cat.id)}
                  >
                    {isRanked && (
                      <span className="rank-badge mono-font">#{rankNum}</span>
                    )}
                    <div className="interest-header">
                      <h3>{cat.label}</h3>
                    </div>
                    <p className="interest-desc mono-font">{cat.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="actions-column">
              <div className="onboarding-actions">
                <button className="secondary-btn mono-font" onClick={() => setStep(1)}>
                  BACK
                </button>
                <button className="primary-btn mono-font" onClick={handleFinish}>
                  {isEditMode ? 'Save changes' : 'BUILD MY PLAN'} <Sparkles size={16} />
                </button>
              </div>

              <p className="personalize-disclaimer mono-font">
                This changes event ordering and match labels. All events remain visible.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
