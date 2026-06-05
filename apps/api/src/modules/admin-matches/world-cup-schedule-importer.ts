import { MatchImportInput } from '../../database/queries/matches.queries.js';

const scheduleUrl = 'https://worldcuphub.io/en/schedule';
const sourceTimeZone = 'America/New_York';

export async function importWorldCupSchedule(): Promise<MatchImportInput[]> {
  const response = await fetch(scheduleUrl, {
    headers: {
      'user-agent': 'Predictor26 schedule importer'
    }
  });

  if (!response.ok) {
    throw new Error(`Schedule import failed with status ${response.status}.`);
  }

  return parseScheduleHtml(await response.text());
}

function parseScheduleHtml(html: string): MatchImportInput[] {
  const lines = htmlToLines(html);
  const matches: MatchImportInput[] = [];
  let activeDate: ParsedDate | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const date = parseDateLine(lines[index]);

    if (date) {
      activeDate = date;
      continue;
    }

    if (!activeDate || lines[index + 1] !== 'vs') {
      continue;
    }

    const homeTeamName = lines[index];
    const awayTeamName = lines[index + 2];
    const timeLine = lines[index + 3];
    const timeZoneLine = lines[index + 4];
    const city = lines[index + 5];
    const separator = lines[index + 6];
    const venue = lines[index + 7];
    const roundLine = lines[index + 8];

    if (!/^\d{2}:\d{2}$/.test(timeLine) || timeZoneLine !== 'ET' || separator !== '·' || !roundLine) {
      continue;
    }

    const roundLabel = normalizeRoundLabel(roundLine);
    const groupName = roundLabel.startsWith('Group ') ? roundLabel.replace('Group ', '') : null;

    matches.push({
      matchNumber: matches.length + 1,
      stage: groupName ? 'Group stage' : knockoutStageName(roundLabel),
      groupName,
      roundLabel,
      kickoffAt: toUtcIso(activeDate, timeLine),
      sourceTimeZone,
      homeTeamName,
      awayTeamName,
      homeTeamFlag: flagForTeam(homeTeamName),
      awayTeamFlag: flagForTeam(awayTeamName),
      venue,
      city
    });
  }

  return matches;
}

function htmlToLines(html: string): string[] {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDateLine(line: string): ParsedDate | null {
  const match = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (June|July) (\d{1,2}), 2026$/.exec(
    line
  );

  if (!match) {
    return null;
  }

  return {
    month: match[1] === 'June' ? 6 : 7,
    day: Number(match[2])
  };
}

function toUtcIso(date: ParsedDate, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const utc = Date.UTC(2026, date.month - 1, date.day, hours + 3, minutes, 0);

  return new Date(utc).toISOString();
}

function normalizeRoundLabel(round: string): string {
  if (round.startsWith('Grp ')) {
    return `Group ${round.replace('Grp ', '')}`;
  }

  const labels: Record<string, string> = {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter-finals',
    SF: 'Semi-finals',
    '3rd': 'Third-place play-off',
    Final: 'Final'
  };

  return labels[round] ?? round;
}

function knockoutStageName(roundLabel: string): string {
  return roundLabel === 'Final' || roundLabel === 'Third-place play-off' ? roundLabel : 'Knockout stage';
}

function flagForTeam(teamName: string): string | null {
  const countryCode = teamCountryCodes[teamName];

  if (!countryCode) {
    return null;
  }

  return countryCode
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&atilde;/g, 'ã')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g, 'ü')
    .replace(/&iuml;/g, 'ï')
    .replace(/&rsquo;/g, "'")
    .replace(/&#(\d+);/g, (_entity, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_entity, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
}

interface ParsedDate {
  readonly month: number;
  readonly day: number;
}

const teamCountryCodes: Record<string, string> = {
  Algeria: 'DZ',
  Argentina: 'AR',
  Australia: 'AU',
  Austria: 'AT',
  Belgium: 'BE',
  'Bosnia & Herzegovina': 'BA',
  Brazil: 'BR',
  Canada: 'CA',
  'Cape Verde': 'CV',
  Colombia: 'CO',
  Croatia: 'HR',
  Curaçao: 'CW',
  Czechia: 'CZ',
  'DR Congo': 'CD',
  Ecuador: 'EC',
  Egypt: 'EG',
  England: 'GB',
  France: 'FR',
  Germany: 'DE',
  Ghana: 'GH',
  Haiti: 'HT',
  Iran: 'IR',
  Iraq: 'IQ',
  'Ivory Coast': 'CI',
  Japan: 'JP',
  Jordan: 'JO',
  Mexico: 'MX',
  Morocco: 'MA',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Norway: 'NO',
  Panama: 'PA',
  Paraguay: 'PY',
  Portugal: 'PT',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  Scotland: 'GB',
  Senegal: 'SN',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Spain: 'ES',
  Sweden: 'SE',
  Switzerland: 'CH',
  Tunisia: 'TN',
  Türkiye: 'TR',
  'United States': 'US',
  Uruguay: 'UY',
  Uzbekistan: 'UZ'
};
