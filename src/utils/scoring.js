// Event types and color tokens
export const TYPE_COLORS = {
  Hackathon: '#A78BFA',
  Workshop: '#60A5FA',
  Competition: '#4ADE80',
  'Entrepreneurship and Management': '#FBBF24',
  Others: '#9CA3AF',
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.Others;
}

// Strict IST Date Parsing & Formatting
export function parseAPIDate(dateStr) {
  if (!dateStr) return null;
  // Handle ISO string from API without ad-hoc Z stripping bugs
  const cleanStr = typeof dateStr === 'string' ? dateStr.replace(/Z$/, '') : dateStr;
  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatEventTime(startDateStr, endDateStr) {
  const start = parseAPIDate(startDateStr);
  const end = parseAPIDate(endDateStr);

  if (!start) return 'TBA';

  const startFormatted = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ', ' + start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (!end) return startFormatted;

  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    const startTimeOnly = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTimeOnly = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${startTimeOnly} – ${endTimeOnly}`;
  }

  const endFormatted = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ', ' + end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${startFormatted} – ${endFormatted}`;
}

// Duration Semantics: Separate active hours from calendar day span
export function getDurationSemantics(event) {
  const start = parseAPIDate(event.start_date);
  const end = parseAPIDate(event.end_date);

  if (!start || !end) return { hours: 2, label: '2 hours', calendarSpan: 'Single Day' };

  const totalHours = Math.max(1, Math.round((end - start) / (1000 * 3600)));
  const daySpanCount = Math.max(1, Math.ceil((new Date(end.getFullYear(), end.getMonth(), end.getDate()) - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / (1000 * 3600 * 24)) + 1);

  const hoursLabel = totalHours >= 24 ? `${totalHours}h` : `${totalHours} hours`;
  const daysLabel = daySpanCount > 1 ? `${daySpanCount} calendar days` : '1 day';

  return {
    hours: totalHours,
    days: daySpanCount,
    label: `${hoursLabel} (${daysLabel})`,
    hoursLabel,
    daysLabel
  };
}

// Multi-Interest Ranked Scoring Algorithm with Contribution Breakdown
export function computeUserScore(event, rankedInterests = []) {
  if (!rankedInterests || rankedInterests.length === 0) {
    return {
      score: 75,
      matchPercentage: 75,
      breakdown: ['General Gravitas Pick'],
      topMatchedCategory: 'General'
    };
  }

  // Diminishing rank weight multipliers for ranked interests
  const RANK_WEIGHTS = [1.0, 0.65, 0.40, 0.25, 0.15];

  let totalScoreContribution = 0;
  let maxPossibleScore = 0;
  const contributions = [];

  rankedInterests.forEach((item, index) => {
    const catId = typeof item === 'string' ? item : item.id;
    const weight = RANK_WEIGHTS[index] || 0.1;
    maxPossibleScore += 100 * weight;

    const categoryScore = event.scores ? (event.scores[catId] || 0) : 0;
    const contributionPoints = categoryScore * weight;
    totalScoreContribution += contributionPoints;

    if (categoryScore > 15) {
      const catLabel = catId.replace('_', ' ').toUpperCase();
      contributions.push({
        catId,
        label: catLabel,
        points: Math.round(contributionPoints),
        rawScore: categoryScore
      });
    }
  });

  contributions.sort((a, b) => b.points - a.points);

  const matchPercentage = Math.min(99, Math.max(15, Math.round((totalScoreContribution / maxPossibleScore) * 100)));

  const breakdownStrings = contributions.slice(0, 3).map(c => `${c.label} ${c.points}`);
  if (breakdownStrings.length === 0) breakdownStrings.push('Gravitas Highlight');

  return {
    score: matchPercentage,
    matchPercentage,
    breakdown: breakdownStrings,
    topMatchedCategory: contributions[0]?.label || 'General',
    contributions
  };
}

export function sortEventsByScore(events, rankedInterests = [], sortMode = 'relevance') {
  const scored = events.map(event => {
    const scoreData = computeUserScore(event, rankedInterests);
    return {
      ...event,
      score: scoreData.score,
      matchPercentage: scoreData.matchPercentage,
      relevanceBreakdown: scoreData.breakdown,
      topMatchedCategory: scoreData.topMatchedCategory
    };
  });

  if (sortMode === 'soonest') {
    return scored.sort((a, b) => (parseAPIDate(a.start_date) || 0) - (parseAPIDate(b.start_date) || 0));
  }
  if (sortMode === 'free') {
    return scored.sort((a, b) => (a.price || 0) - (b.price || 0));
  }
  if (sortMode === 'shortest') {
    return scored.sort((a, b) => getDurationSemantics(a).hours - getDurationSemantics(b).hours);
  }

  // Default: relevance score descending
  return scored.sort((a, b) => b.score - a.score);
}

// Helper to check if event has no specific time
function eventHasNoSpecificTime(event) {
  if (!event.start_date) return true;
  // If start and end date exist, it has specific times
  return false;
}

// Data adapter for FullCalendar events
export function toFullCalendarEvent(event, isConflict = false) {
  const start = parseAPIDate(event.start_date);
  const end = parseAPIDate(event.end_date) || (start ? new Date(start.getTime() + 2 * 3600 * 1000) : null);

  const durationHours = start && end ? (end - start) / (1000 * 3600) : 2;
  const isMultiDay = durationHours >= 20 || event.tags?.includes('multi-day') || event.tags?.includes('overnight');
  const typeColor = getTypeColor(event.type);

  const classNames = [];
  if (isMultiDay) classNames.push('fc-event-multiday');

  return {
    id: event.id,
    title: event.name,
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined,
    allDay: eventHasNoSpecificTime(event),
    // A conflict describes an interval between two events, not the whole event.
    // Keep the event in its category colour; CalendarView draws the overlap as a
    // separate time-bounded background event.
    backgroundColor: isMultiDay ? `${typeColor}18` : `${typeColor}25`,
    borderColor: typeColor,
    textColor: '#F0EDE6',
    classNames,
    extendedProps: {
      ...event,
      isConflict,
      isMultiDay,
      typeColor,
      durationHours
    }
  };
}
