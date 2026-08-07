import * as ics from 'ics';
import { saveAs } from 'file-saver';
import { parseAPIDate } from './scoring';

export function exportEventsToICS(events) {
  if (!events || events.length === 0) return;

  const icsEvents = events.map(event => {
    const start = parseAPIDate(event.start_date) || new Date();
    const end = parseAPIDate(event.end_date) || new Date(start.getTime() + 2 * 3600 * 1000);
    
    return {
      title: event.name,
      description: (event.short_description || event.name) + '\n\nOrganizing Club: ' + (event.club || 'VIT') + '\n\nOfficial Page: ' + (event.official_url || 'https://gravitas.vit.ac.in'),
      location: event.venue || 'VIT Campus',
      start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
      end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
    };
  });

  const { error, value } = ics.createEvents(icsEvents);

  if (error) {
    console.error(error);
    alert('Failed to generate calendar file.');
    return;
  }

  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, 'gravitas_my_schedule.ics');
}

export const exportScheduleToICS = exportEventsToICS;
