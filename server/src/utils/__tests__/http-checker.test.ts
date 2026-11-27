import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  buildSafeTargetUrl: vi.fn(),
}));

vi.mock("node:http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:http")>();
  return { ...actual, request: mocks.request };
});

vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  return { ...actual, request: mocks.request };
});

vi.mock("../url-security.js", () => ({
  buildSafeTargetUrl: mocks.buildSafeTargetUrl,
}));

import { checkHttpEndpoint } from "../http-checker.js";

function createResponse(statusCode: number) {
  const response = new EventEmitter() as EventEmitter & {
    statusCode: number;
    resume: () => void;
  };
  response.statusCode = statusCode;
  response.resume = () => response.emit("end");
  return response;
}

describe("checkHttpEndpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildSafeTargetUrl.mockResolvedValue({
      url: new URL("https://example.com/health"),
      address: "2606:4700:4700::1111",
      family: 6,
      addresses: [
        { address: "2606:4700:4700::1111", family: 6 },
        { address: "93.184.216.34", family: 4 },
      ],
    });
  });

  it("tries another validated address after an unreachable route", async () => {
    let requestCount = 0;
    const lookupResults: unknown[] = [];
    mocks.request.mockImplementation(
      (_url: URL, rawOptions: unknown, onResponse: (response: EventEmitter) => void) => {
        requestCount += 1;
        const options = rawOptions as {
          lookup: (
            hostname: string,
            options: { all: boolean },
            callback: (
              error: Error | null,
              addresses: string | Array<{ address: string; family: number }>,
              family?: number,
            ) => void,
          ) => void;
        };
        options.lookup("example.com", { all: true }, (error, addresses) => {
          expect(error).toBeNull();
          lookupResults.push(addresses);
        });
        const request = new EventEmitter() as EventEmitter & {
          end: () => void;
          destroy: (error?: Error) => void;
        };
        request.end = () => {
          queueMicrotask(() => {
            if (requestCount === 1) {
              const error = Object.assign(new Error("network unreachable"), {
                code: "ENETUNREACH",
              });
              request.emit("error", error);
              return;
            }
            onResponse(createResponse(204));
          });
        };
        request.destroy = (error) => {
          if (error) {
            request.emit("error", error);
          }
        };
        return request;
      },
    );

    const result = await checkHttpEndpoint({
      baseUrl: "https://example.com",
      endpoint: "/health",
      method: "GET",
      timeoutSeconds: 5,
    });

    expect(result.status).toBe("success");
    expect(result.statusCode).toBe(204);
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(lookupResults).toEqual([
      [{ address: "2606:4700:4700::1111", family: 6 }],
      [{ address: "93.184.216.34", family: 4 }],
    ]);
  });

  it("does not retry after receiving an HTTP error response", async () => {
    mocks.request.mockImplementation(
      (_url: URL, _options: unknown, onResponse: (response: EventEmitter) => void) => {
        const request = new EventEmitter() as EventEmitter & {
          end: () => void;
          destroy: (error?: Error) => void;
        };
        request.end = () => queueMicrotask(() => onResponse(createResponse(503)));
        request.destroy = (error) => {
          if (error) {
            request.emit("error", error);
          }
        };
        return request;
      },
    );

    const result = await checkHttpEndpoint({
      baseUrl: "https://example.com",
      endpoint: "/health",
      method: "GET",
      timeoutSeconds: 5,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("HTTP 503");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
