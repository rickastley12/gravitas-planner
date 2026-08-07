import { parseAPIDate, formatEventTime } from './scoring';

export function buildPlanText(events) {
  if (!events || events.length === 0) return '';

  const sorted = [...events].sort((a, b) => {
    const dateA = parseAPIDate(a.start_date);
    const dateB = parseAPIDate(b.start_date);
    return (dateA || 0) - (dateB || 0);
  });

  const lines = ['MY GRAVITAS \'26 PLAN', ''];

  sorted.forEach((event, index) => {
    lines.push(`${index + 1}. ${event.name}`);
    lines.push(`   Date & Time: ${formatEventTime(event.start_date, event.end_date)}`);
    lines.push(`   Venue: ${event.venue || 'TBA'}`);
    lines.push(`   Club: ${event.club || 'VIT'}`);
    lines.push(`   Price: ${event.price === 0 ? 'Free' : `Rs. ${event.price}`}`);
    lines.push('');
  });

  const totalCost = sorted.reduce((acc, curr) => acc + (curr.price || 0), 0);
  lines.push(`Total events: ${sorted.length} | Total cost: Rs. ${totalCost}`);
  lines.push('Made with Gravitas Planner');

  return lines.join('\n');
}

export async function copyPlanAsText(events) {
  const text = buildPlanText(events);
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
