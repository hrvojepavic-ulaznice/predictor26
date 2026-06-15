import { WorldCupTeamsResponse } from './world-cup-teams.interfaces.js';
import { findWorldCupGroupTeams, findWorldCupTeamNames } from './world-cup-teams.repository.js';

export function getWorldCupTeams(): WorldCupTeamsResponse {
  return {
    teams: getWorldCupTeamNames(),
    groupTeams: findWorldCupGroupTeams().map((team) => ({
      name: team.team_name,
      flag: team.team_flag,
      groupName: team.group_name
    }))
  };
}

export function getWorldCupTeamNames(): string[] {
  const importedTeams = new Set(findWorldCupTeamNames());
  const importedQualifiedTeams = qualifiedTeamNames.filter((teamName) => importedTeams.has(teamName));

  if (importedQualifiedTeams.length > 0) {
    return importedQualifiedTeams;
  }

  return qualifiedTeamNames;
}

const qualifiedTeamNames = [
  'Algeria',
  'Argentina',
  'Australia',
  'Austria',
  'Belgium',
  'Bosnia & Herzegovina',
  'Brazil',
  'Canada',
  'Cape Verde',
  'Colombia',
  'Croatia',
  'Curaçao',
  'Czechia',
  'DR Congo',
  'Ecuador',
  'Egypt',
  'England',
  'France',
  'Germany',
  'Ghana',
  'Haiti',
  'Iran',
  'Iraq',
  'Ivory Coast',
  'Japan',
  'Jordan',
  'Mexico',
  'Morocco',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Panama',
  'Paraguay',
  'Portugal',
  'Qatar',
  'Saudi Arabia',
  'Scotland',
  'Senegal',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Tunisia',
  'Türkiye',
  'United States',
  'Uruguay',
  'Uzbekistan'
];
