import { isIP } from "node:net";

/** Normalises the request/session IP so IPv4 and IPv4-mapped IPv6 compare reliably. */
export const normalizeIpAddress = (value: string | null | undefined): string | null => {
  if (!value) return null;

  let candidate = value.split(",", 1)[0]?.trim().toLowerCase() ?? "";
  if (!candidate) return null;

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  }

  if (candidate.startsWith("::ffff:")) candidate = candidate.slice(7);

  // Remove a port from plain IPv4 values while leaving IPv6 untouched.
  if (candidate.includes(".") && candidate.split(":").length === 2) {
    candidate = candidate.split(":", 1)[0] ?? candidate;
  }

  const zoneIndex = candidate.indexOf("%");
  if (zoneIndex >= 0) candidate = candidate.slice(0, zoneIndex);

  return isIP(candidate) ? candidate : null;
};

export const getIpLookupCandidates = (value: string | null | undefined): string[] => {
  const raw = value?.split(",", 1)[0]?.trim().toLowerCase() ?? "";
  const normalized = normalizeIpAddress(raw);
  if (!normalized) return [];

  return [
    ...new Set([
      normalized,
      raw,
      ...(normalized.includes(":") ? [] : [`::ffff:${normalized}`]),
    ]),
  ];
};
