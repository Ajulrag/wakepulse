import { describe, expect, it } from "vitest";
import {
  buildSafeTargetUrl,
  isBlockedIp,
} from "../url-security.js";

describe("outbound destination validation", () => {
  it("allows a public IP address and binds the returned target to it", async () => {
    const target = await buildSafeTargetUrl(
      "https://8.8.8.8",
      "/health",
    );

    expect(target.url.href).toBe("https://8.8.8.8/health");
    expect(target.address).toBe("8.8.8.8");
    expect(target.family).toBe(4);
  });

  it.each([
    "127.0.0.1",
    "10.0.0.4",
    "169.254.169.254",
    "192.0.2.1",
    "198.51.100.10",
    "203.0.113.8",
    "::1",
    "::8.8.8.8",
    "fc00::1",
    "fe90::1",
    "ff02::1",
    "2001:db8::1",
    "2002::1",
    "3fff::1",
    "64:ff9b::808:808",
    "::ffff:127.0.0.1",
  ])("blocks non-public destination %s", (address) => {
    expect(isBlockedIp(address)).toBe(true);
  });

  it("allows a globally routable IPv6 address", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("rejects endpoint scheme and port changes", async () => {
    await expect(
      buildSafeTargetUrl("https://8.8.8.8", "http://8.8.8.8:8080/health"),
    ).rejects.toThrow("ENDPOINT_HOST_MISMATCH");
  });

  it("rejects embedded credentials", async () => {
    await expect(
      buildSafeTargetUrl("https://user:password@8.8.8.8", "/health"),
    ).rejects.toThrow("INVALID_URL");
  });
});
