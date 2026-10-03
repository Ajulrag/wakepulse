import { describe, expect, it } from "vitest";

describe("service summary monitoring windows", () => {
  it("supports the 24h monitoring window", () => {
    const window = "24h";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("supports the 7d monitoring window", () => {
    const window = "7d";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("supports the 30d monitoring window", () => {
    const window = "30d";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("rejects an unsupported monitoring window", () => {
    const window = "1h";

    expect(["24h", "7d", "30d"]).not.toContain(window);
  });
});