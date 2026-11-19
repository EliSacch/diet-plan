const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toIsoDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (match === null) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function shiftIsoDate(isoDate: string, days: number) {
  const date = parseIsoDate(isoDate);
  if (date === null) {
    throw new RangeError(`Not an ISO date: ${isoDate}`);
  }
  return toIsoDate(addDays(date, days));
}

export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function todayIso() {
  return toIsoDate(new Date());
}
