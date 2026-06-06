import { MatchImportInput } from '../../database/queries/matches.queries.js';
import {
  fetchOddsPortalSportData,
  friendlyInternationalOddsPortalUrl,
  oddsPortalRows,
  OddsPortalEventRow
} from './oddsportal-odds-importer.js';

const sourceTimeZone = 'UTC';
const displayTimeZone = 'Europe/Zagreb';

export async function importOddsPortalFriendlySchedule(): Promise<MatchImportInput[]> {
  const sportData = await fetchOddsPortalSportData(friendlyInternationalOddsPortalUrl);

  const now = new Date();

  return oddsPortalRows(sportData)
    .filter((event) => isUpcomingToday(event, now))
    .flatMap(toMatchImportInput);
}

function toMatchImportInput(event: OddsPortalEventRow, index: number): MatchImportInput[] {
  const homeTeamName = event['home-name'];
  const awayTeamName = event['away-name'];
  const kickoffTimestamp = event['date-start-timestamp'] ?? event['date-start-base'];

  if (!homeTeamName || !awayTeamName || !kickoffTimestamp) {
    return [];
  }

  const roundLabel = event['tournament-name'] || 'Friendly international';

  return [
    {
      matchNumber: index + 1,
      stage: roundLabel,
      groupName: null,
      roundLabel,
      kickoffAt: new Date(kickoffTimestamp * 1000).toISOString(),
      sourceTimeZone,
      homeTeamName,
      awayTeamName,
      homeTeamFlag: null,
      awayTeamFlag: null,
      venue: event.venue ?? '',
      city: event.venueTown ?? event['country-name'] ?? ''
    }
  ];
}

function isUpcomingToday(event: OddsPortalEventRow, now: Date): boolean {
  const kickoffTimestamp = event['date-start-timestamp'] ?? event['date-start-base'];

  if (!kickoffTimestamp) {
    return false;
  }

  const kickoff = new Date(kickoffTimestamp * 1000);

  return kickoff.getTime() > now.getTime() && localDateKey(kickoff) === localDateKey(now);
}

function localDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: displayTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}
