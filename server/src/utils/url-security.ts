import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);

const BLOCKED_IPV4_RANGES = [
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "100.64.0.0", end: "100.127.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.0.0.0", end: "192.0.0.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "198.18.0.0", end: "198.19.255.255" },
  { start: "224.0.0.0", end: "255.255.255.255" },
];

function ipv4ToNumber(ip: string): number {
  return ip
    .split(".")
    .reduce(
      (result, octet) =>
        result * 256 + Number(octet),
      0,
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
  const normalized = ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return isBlockedIpv4(ip);
  }

  if (version === 6) {
    return isBlockedIpv6(ip);
  }

  return false;
}

async function assertSafeHostname(
  hostname: string,
): Promise<void> {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(normalizedHostname)) {
    throw new Error("BLOCKED_HOSTNAME");
  }

  if (net.isIP(normalizedHostname)) {
    if (isBlockedIp(normalizedHostname)) {
      throw new Error("BLOCKED_IP");
    }

    return;
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
}

export async function buildSafeTargetUrl(
  baseUrl: string,
  endpoint: string,
): Promise<string> {
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

  if (!base.hostname) {
    throw new Error("INVALID_URL");
  }

  await assertSafeHostname(base.hostname);

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

  if (
    target.hostname.toLowerCase() !==
    base.hostname.toLowerCase()
  ) {
    throw new Error("ENDPOINT_HOST_MISMATCH");
  }

  await assertSafeHostname(target.hostname);

  return target.toString();
}