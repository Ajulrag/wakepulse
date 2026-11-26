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

  const request = (target.url.protocol === "https:"
    ? httpsRequest
    : httpRequest)(
    target.url,
    {
      method: input.method,
      agent: target.url.protocol === "https:" ? httpsAgent : httpAgent,
      lookup: (_hostname, _options, callback) => {
        callback(null, target.address, target.family);
      },
    },
    (response) => {
      clearTimeout(timeout);
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

      const responseTime = Math.round(
        performance.now() - startedAt,
      );
      const statusCode = response.statusCode ?? null;

      resolveResult({
        status:
          statusCode !== null && statusCode >= 200 && statusCode < 300
            ? "success"
            : "failed",
        statusCode,
        responseTime,
        error:
          statusCode !== null && statusCode >= 200 && statusCode < 300
            ? null
            : statusCode === null
              ? "Request failed"
              : `HTTP ${statusCode}`,
      });
    },
  );

  let settled = false;
  let resolveResult: (result: HttpCheckResult) => void = () => undefined;
  const resultPromise = new Promise<HttpCheckResult>((resolve) => {
    resolveResult = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
  });

  const timeout = setTimeout(() => {
    request.destroy(new Error("Request timed out"));
  }, input.timeoutSeconds * 1000);

  request.on("error", (error: NodeJS.ErrnoException) => {
    clearTimeout(timeout);
    const responseTime = Math.round(
      performance.now() - startedAt,
    );
    const timedOut =
      error.message === "Request timed out" ||
      error.code === "ETIMEDOUT";

    resolveResult({
      status: timedOut ? "timeout" : "error",
      statusCode: null,
      responseTime,
      error: timedOut
        ? "Request timed out"
        : error.message || "Request failed",
    });
  });

  request.end();

  return resultPromise;
}
