export function formatFixedNumber(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

export function formatOddsValue(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 99.95) {
    return value.toFixed(0);
  }

  if (absoluteValue >= 9.95) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}
