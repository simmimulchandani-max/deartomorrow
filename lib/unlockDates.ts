export function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function hasDateArrived(dateString: string | null | undefined) {
  return Boolean(dateString && dateString <= dateOnly(new Date()));
}
