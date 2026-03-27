function parseDuration(str) {
  if (!str) return null;
  const regex = /(\d+)\s*(s|sec|m|min|мин|ч|h|d|д|д\.|w|нед)/gi;
  let total = 0;
  let match;
  const copy = str.toLowerCase();
  const r = /(\d+)\s*(s|sec|m|min|мин|ч|h|d|д|w|нед)/gi;
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
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m} минут`;
  return `${h} часов ${m} минут`;
}

module.exports = { parseDuration, formatDuration, formatSeconds };
