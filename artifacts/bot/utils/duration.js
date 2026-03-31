function parseDuration(str) {
  if (!str) return null;
  const copy = str.toLowerCase();
  const r = /(\d+)\s*(s|sec|m|min|мин|ч|h|d|д|w|нед)/gi;
  let total = 0;
  let match;
  while ((match = r.exec(copy)) !== null) {
    const num = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's' || unit === 'sec') total += num * 1000;
    else if (unit === 'm' || unit === 'min' || unit === 'мин') total += num * 60_000;
    else if (unit === 'h' || unit === 'ч') total += num * 3_600_000;
    else if (unit === 'd' || unit === 'д') total += num * 86_400_000;
    else if (unit === 'w' || unit === 'нед') total += num * 604_800_000;
  }
  return total || null;
}

function formatDuration(ms) {
  if (!ms) return 'навсегда';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  const parts = [];
  if (d) parts.push(`${d} д.`);
  if (h) parts.push(`${h} ч.`);
  if (m) parts.push(`${m} мин.`);
  if (sc && !d && !h) parts.push(`${sc} сек.`);
  return parts.join(' ') || '0 сек.';
}

function formatSeconds(secs) {
  const n = Number(secs) || 0;
  const days = Math.floor(n / 86400);
  const hours = Math.floor((n % 86400) / 3600);
  const mins = Math.floor((n % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days} д.`);
  if (hours) parts.push(`${hours} ч.`);
  if (!days) parts.push(`${mins} мин.`);
  return parts.join(' ') || '0 мин.';
}

function formatMs(ms) {
  return formatSeconds(Math.floor((Number(ms) || 0) / 1000));
}

module.exports = { parseDuration, formatDuration, formatSeconds, formatMs };
