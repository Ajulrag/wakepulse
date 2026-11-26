import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);

const BLOCKED_IPV4_RANGES = [
  { start: "0.0.0.0", end: "0.255.255.255" },
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "100.64.0.0", end: "100.127.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.0.0.0", end: "192.0.0.255" },
  { start: "192.0.2.0", end: "192.0.2.255" },
  { start: "192.88.99.0", end: "192.88.99.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "198.18.0.0", end: "198.19.255.255" },
  { start: "198.51.100.0", end: "198.51.100.255" },
  { start: "203.0.113.0", end: "203.0.113.255" },
  { start: "224.0.0.0", end: "255.255.255.255" },
];

export interface SafeTarget {
  url: URL;
  address: string;
  family: 4 | 6;
}

function ipv4ToNumber(ip: string): number {
  return ip
    .split(".")
    .reduce(
      (result, octet) =>
        result * 256 + Number(octet),
      0,
    );
}

function ipv6ToBigInt(ip: string): bigint {
  let normalized = ip.toLowerCase();

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4Value = BigInt(ipv4ToNumber(normalized.slice(lastColon + 1)));
    const high = Number((ipv4Value >> 16n) & 0xffffn).toString(16);
    const low = Number(ipv4Value & 0xffffn).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }

  const [leftText = "", rightText] = normalized.split("::");
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  const missingSegments = 8 - left.length - right.length;
  const segments = rightText === undefined
    ? left
    : [...left, ...Array.from({ length: missingSegments }, () => "0"), ...right];

  return segments.reduce(
    (value, segment) => (value << 16n) | BigInt(`0x${segment || "0"}`),
    0n,
  );
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToNumber(ip);

  return BLOCKED_IPV4_RANGES.some((range) => {
    return (
      value >= ipv4ToNumber(range.start) &&
      value <= ipv4ToNumber(range.end)
    );
  });
}

function isBlockedIpv6(ip: string): boolean {
  const value = ipv6ToBigInt(ip);

  const ipv4MappedPrefix = value >> 32n;
  if (ipv4MappedPrefix === 0xffffn) {
    const ipv4Value = Number(value & 0xffffffffn);
    const ipv4 = [
      (ipv4Value >>> 24) & 0xff,
      (ipv4Value >>> 16) & 0xff,
      (ipv4Value >>> 8) & 0xff,
      ipv4Value & 0xff,
    ].join(".");
    return isBlockedIpv4(ipv4);
  }

  const isGlobalUnicast = value >> 125n === 1n;
  const isIanaSpecialPurpose = value >> 105n === 0x100080n;

  return (
    !isGlobalUnicast ||
    isIanaSpecialPurpose ||
    value >> 96n === 0x20010db8n ||
    value >> 112n === 0x2002n ||
    value >> 108n === 0x3fff0n
  );
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return isBlockedIpv4(ip);
  }

  if (version === 6) {
    return isBlockedIpv6(ip);
  }

  return false;
}

async function resolveSafeHostname(
  hostname: string,
): Promise<Array<{ address: string; family: 4 | 6 }>> {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(normalizedHostname)) {
    throw new Error("BLOCKED_HOSTNAME");
  }

  const ipVersion = net.isIP(normalizedHostname);
  if (ipVersion) {
    if (isBlockedIp(normalizedHostname)) {
      throw new Error("BLOCKED_IP");
    }

    return [{
      address: normalizedHostname,
      family: ipVersion as 4 | 6,
    }];
  }

  const addresses = await dns.lookup(
    normalizedHostname,
    {
      all: true,
      verbatim: true,
    },
  );

  if (addresses.length === 0) {
    throw new Error("HOSTNAME_RESOLUTION_FAILED");
  }

  for (const address of addresses) {
    if (isBlockedIp(address.address)) {
      throw new Error("BLOCKED_IP");
    }
  }

  return addresses as Array<{ address: string; family: 4 | 6 }>;
}

export async function buildSafeTargetUrl(
  baseUrl: string,
  endpoint: string,
): Promise<SafeTarget> {
  let base: URL;

  try {
    base = new URL(baseUrl);
  } catch {
    throw new Error("INVALID_URL");
  }

  if (
    base.protocol !== "http:" &&
    base.protocol !== "https:"
  ) {
    throw new Error("UNSUPPORTED_PROTOCOL");
  }

  if (!base.hostname || base.username || base.password) {
    throw new Error("INVALID_URL");
  }

  let target: URL;

  try {
    target = new URL(endpoint, base);
  } catch {
    throw new Error("INVALID_ENDPOINT");
  }

  if (
    target.protocol !== "http:" &&
    target.protocol !== "https:"
  ) {
    throw new Error("UNSUPPORTED_PROTOCOL");
  }

  if (target.origin !== base.origin || target.username || target.password) {
    throw new Error("ENDPOINT_HOST_MISMATCH");
  }

  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolveSafeHostname(hostname);
  const address = addresses[0];

  if (!address) {
    throw new Error("HOSTNAME_RESOLUTION_FAILED");
  }

  return {
    url: target,
    address: address.address,
    family: address.family,
  };
}
