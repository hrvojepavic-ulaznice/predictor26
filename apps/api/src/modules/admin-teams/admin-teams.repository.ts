import { openDatabase } from '../../database/index.js';

export interface AdminTeamRow {
  readonly normalized_name: string;
  readonly name: string | null;
  readonly display_name: string | null;
  readonly logo_url: string;
  readonly group_name: string | null;
}

export function listAdminTeams(competitionId: number): AdminTeamRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          WITH team_sources AS (
            SELECT competition_id, home_team_name AS team_name FROM matches
            UNION
            SELECT competition_id, away_team_name AS team_name FROM matches
          )
          SELECT
            competition_teams.normalized_name,
            COALESCE(
              (
                SELECT team_sources.team_name
                FROM team_sources
                WHERE team_sources.competition_id = competition_teams.competition_id
                  AND lower(trim(team_sources.team_name)) = competition_teams.normalized_name
                ORDER BY length(team_sources.team_name) DESC
                LIMIT 1
              ),
              NULLIF(competition_teams.name, ''),
              NULLIF(competition_teams.display_name, ''),
              competition_teams.normalized_name
            ) AS name,
            competition_teams.display_name,
            competition_teams.logo_url,
            competition_teams.group_name
          FROM competition_teams
          WHERE competition_teams.competition_id = ?
          ORDER BY name COLLATE NOCASE ASC
        `
      )
      .all(competitionId) as AdminTeamRow[];
  } finally {
    db.close();
  }
}

export function findAdminTeam(competitionId: number, normalizedName: string): AdminTeamRow | null {
  const db = openDatabase();

  try {
    return (
      (db
        .prepare(
          `
            WITH team_sources AS (
              SELECT competition_id, home_team_name AS team_name FROM matches
              UNION
              SELECT competition_id, away_team_name AS team_name FROM matches
            )
            SELECT
              competition_teams.normalized_name,
              COALESCE(
                (
                  SELECT team_sources.team_name
                  FROM team_sources
                  WHERE team_sources.competition_id = competition_teams.competition_id
                    AND lower(trim(team_sources.team_name)) = competition_teams.normalized_name
                  ORDER BY length(team_sources.team_name) DESC
                  LIMIT 1
                ),
                NULLIF(competition_teams.name, ''),
                NULLIF(competition_teams.display_name, ''),
                competition_teams.normalized_name
              ) AS name,
              competition_teams.display_name,
              competition_teams.logo_url,
              competition_teams.group_name
            FROM competition_teams
            WHERE competition_teams.competition_id = ?
              AND competition_teams.normalized_name = ?
          `
        )
        .get(competitionId, normalizedName) as AdminTeamRow | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export function updateAdminTeamDisplayName(
  competitionId: number,
  normalizedName: string,
  displayName: string
): AdminTeamRow | null {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE competition_teams
        SET display_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE competition_id = ?
          AND normalized_name = ?
      `
    ).run(displayName, competitionId, normalizedName);

    return (
      (db
        .prepare(
          `
            WITH team_sources AS (
              SELECT competition_id, home_team_name AS team_name FROM matches
              UNION
              SELECT competition_id, away_team_name AS team_name FROM matches
            )
            SELECT
              competition_teams.normalized_name,
              COALESCE(
                (
                  SELECT team_sources.team_name
                  FROM team_sources
                  WHERE team_sources.competition_id = competition_teams.competition_id
                    AND lower(trim(team_sources.team_name)) = competition_teams.normalized_name
                  ORDER BY length(team_sources.team_name) DESC
                  LIMIT 1
                ),
                NULLIF(competition_teams.name, ''),
                NULLIF(competition_teams.display_name, ''),
                competition_teams.normalized_name
              ) AS name,
              competition_teams.display_name,
              competition_teams.logo_url,
              competition_teams.group_name
            FROM competition_teams
            WHERE competition_teams.competition_id = ?
              AND competition_teams.normalized_name = ?
          `
        )
        .get(competitionId, normalizedName) as AdminTeamRow | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export function updateAdminTeamLogoUrl(
  competitionId: number,
  normalizedName: string,
  logoUrl: string
): AdminTeamRow | null {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE competition_teams
        SET logo_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE competition_id = ?
          AND normalized_name = ?
      `
    ).run(logoUrl, competitionId, normalizedName);

    return (
      (db
        .prepare(
          `
            WITH team_sources AS (
              SELECT competition_id, home_team_name AS team_name FROM matches
              UNION
              SELECT competition_id, away_team_name AS team_name FROM matches
            )
            SELECT
              competition_teams.normalized_name,
              COALESCE(
                (
                  SELECT team_sources.team_name
                  FROM team_sources
                  WHERE team_sources.competition_id = competition_teams.competition_id
                    AND lower(trim(team_sources.team_name)) = competition_teams.normalized_name
                  ORDER BY length(team_sources.team_name) DESC
                  LIMIT 1
                ),
                NULLIF(competition_teams.name, ''),
                NULLIF(competition_teams.display_name, ''),
                competition_teams.normalized_name
              ) AS name,
              competition_teams.display_name,
              competition_teams.logo_url,
              competition_teams.group_name
            FROM competition_teams
            WHERE competition_teams.competition_id = ?
              AND competition_teams.normalized_name = ?
          `
        )
        .get(competitionId, normalizedName) as AdminTeamRow | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export function countTeamLogoUrlReferences(logoUrl: string): number {
  const db = openDatabase();

  try {
    const row = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM competition_teams
          WHERE logo_url = ?
        `
      )
      .get(logoUrl) as { readonly count: number } | undefined;

    return row?.count ?? 0;
  } finally {
    db.close();
  }
}
