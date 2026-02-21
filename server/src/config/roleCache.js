// In-memory cache: key -> { accountType, expires }
// Populated when user logs in via our proxy; used as fallback when JWT lacks accountType
const roleCache = new Map();
const TTL = 24 * 60 * 60 * 1000; // 24 hours

function set(keys, accountType) {
  if (!accountType) return;
  const entry = { accountType: String(accountType).toLowerCase(), expires: Date.now() + TTL };
  const arr = Array.isArray(keys) ? keys : [keys];
  arr.filter(Boolean).forEach((k) => roleCache.set(String(k), entry));
}

function get(key) {
  const entry = roleCache.get(String(key));
  if (!entry || Date.now() > entry.expires) return null;
  return entry.accountType;
}

module.exports = { set, get };
