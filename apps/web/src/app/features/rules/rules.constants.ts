export const PREDICTOR_RULES = [
  'Exact score predictions award 1 point.',
  'Correct match outcome predictions award points equal to the selected odds coefficient.',
  'Points accumulate match by match across the competition.',
  'Users are ranked first by total points.',
  'The World Cup winner tiebreaker is the second ranking criterion.',
  'Buy-in is 25 EUR per player.',
  'Prize money is split 60% for 1st place, 30% for 2nd place, and 10% for 3rd place.',
  'If users are still tied, prize money is split according to the configured prize distribution.',
  'Predictions must be submitted before the first match of each round.',
  'After the deadline, all users can see all predictions for that round.'
] as const;
