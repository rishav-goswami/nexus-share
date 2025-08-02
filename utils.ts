
export function formatTimeRemaining(expiresAt: number, now: number): string {
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return 'Expired';
  }

  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d left`;
  }
  if (hours > 0) {
    return `${hours}h left`;
  }
  if (minutes > 0) {
    return `${minutes}m left`;
  }
  return `<1m left`;
}
