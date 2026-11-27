import { request as httpRequest, Agent as HttpAgent } from "node:http";
import { request as httpsRequest, Agent as HttpsAgent } from "node:https";
import type { HttpMethod } from "../types/database.js";
import { SCHEDULER_MAX_CONCURRENCY } from "../config/scheduler.js";
import { buildSafeTargetUrl } from "./url-security.js";

export interface HttpCheckResult {
  status: "success" | "failed" | "timeout" | "error";
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
}

interface HttpCheckInput {
  baseUrl: string;
  endpoint: string;
  method: HttpMethod;
  timeoutSeconds: number;
}

const agentOptions = {
  keepAlive: true,
  maxSockets: SCHEDULER_MAX_CONCURRENCY,
  maxTotalSockets: SCHEDULER_MAX_CONCURRENCY,
  maxFreeSockets: Math.min(SCHEDULER_MAX_CONCURRENCY, 5),
};

const MAX_RESPONSE_BYTES = 64 * 1024;
const RESPONSE_DRAIN_TIMEOUT_MS = 1_000;
const RETRYABLE_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EADDRNOTAVAIL",
]);

const httpAgent = new HttpAgent(agentOptions);
const httpsAgent = new HttpsAgent(agentOptions);

export async function checkHttpEndpoint(
  input: HttpCheckInput,
): Promise<HttpCheckResult> {
  const startedAt = performance.now();

  let target: Awaited<ReturnType<typeof buildSafeTargetUrl>>;

  try {
    target = await buildSafeTargetUrl(
      input.baseUrl,
      input.endpoint,
    );
  } catch (error) {
    return {
      status: "error",
      statusCode: null,
      responseTime: Math.round(
        performance.now() - startedAt,
      ),
      error:
        error instanceof Error
          ? error.message
          : "URL validation failed",
    };
  }

  let lastResult: HttpCheckResult | null = null;

  for (const address of target.addresses) {
    const result = await checkAddress(
      target.url,
      address,
      input,
      startedAt,
    );

    if (
      result.status !== "error" ||
      !result.error?.startsWith("NETWORK_ERROR:") ||
      !RETRYABLE_CONNECTION_ERRORS.has(result.error.slice("NETWORK_ERROR:".length))
    ) {
      return result;
    }

    lastResult = result;
  }

  return (
    lastResult ?? {
      status: "error",
      statusCode: null,
      responseTime: Math.round(performance.now() - startedAt),
      error: "NETWORK_ERROR:UNKNOWN",
    }
  );
}

function checkAddress(
  url: URL,
  address: { address: string; family: 4 | 6 },
  input: HttpCheckInput,
  startedAt: number,
): Promise<HttpCheckResult> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result: HttpCheckResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: input.method,
        agent: url.protocol === "https:" ? httpsAgent : httpAgent,
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options.all) {
            callback(null, [address]);
            return;
          }

          callback(null, address.address, address.family);
        },
      },
      (response) => {
        let responseBytes = 0;
        const drainTimeout = setTimeout(
          () => response.destroy(),
          RESPONSE_DRAIN_TIMEOUT_MS,
        );
        response.on("data", (chunk: Buffer) => {
          responseBytes += chunk.length;
          if (responseBytes > MAX_RESPONSE_BYTES) {
            response.destroy();
          }
        });
        response.on("end", () => clearTimeout(drainTimeout));
        response.on("close", () => clearTimeout(drainTimeout));
        response.on("error", () => clearTimeout(drainTimeout));
        response.resume();

        const statusCode = response.statusCode ?? null;
        finish({
          status:
            statusCode !== null && statusCode >= 200 && statusCode < 300
              ? "success"
              : "failed",
          statusCode,
          responseTime: Math.round(performance.now() - startedAt),
          error:
            statusCode !== null && statusCode >= 200 && statusCode < 300
              ? null
              : statusCode === null
                ? "Request failed"
                : `HTTP ${statusCode}`,
        });
      },
    );

    timeout = setTimeout(() => {
      request.destroy(new Error("Request timed out"));
    }, input.timeoutSeconds * 1000);

    request.on("error", (error: NodeJS.ErrnoException) => {
      const code = error.code;
      const timedOut =
        error.message === "Request timed out" ||
        code === "ETIMEDOUT";

      finish({
        status: timedOut ? "timeout" : "error",
        statusCode: null,
        responseTime: Math.round(performance.now() - startedAt),
        error: timedOut
          ? "Request timed out"
          : code && /^[A-Z0-9_]{2,40}$/.test(code)
            ? `NETWORK_ERROR:${code}`
            : "NETWORK_ERROR:UNKNOWN",
      });
    });

    request.end();
  });
}
