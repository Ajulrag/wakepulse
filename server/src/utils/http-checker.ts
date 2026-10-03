import type { HttpMethod } from "../types/database.js";

export interface HttpCheckResult {
  status: "success" | "failed" | "timeout" | "error";
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
}

interface HttpCheckInput {
  url: string;
  method: HttpMethod;
  timeoutSeconds: number;
}

export async function checkHttpEndpoint(
  input: HttpCheckInput,
): Promise<HttpCheckResult> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, input.timeoutSeconds * 1000);

  const startedAt = performance.now();

  try {
    const response = await fetch(input.url, {
      method: input.method,
      signal: controller.signal,
      redirect: "manual",
    });

    const responseTime = Math.round(
      performance.now() - startedAt,
    );

    return {
      status: response.ok ? "success" : "failed",
      statusCode: response.status,
      responseTime,
      error: response.ok
        ? null
        : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Math.round(
      performance.now() - startedAt,
    );

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        status: "timeout",
        statusCode: null,
        responseTime,
        error: "Request timed out",
      };
    }

    return {
      status: "error",
      statusCode: null,
      responseTime,
      error:
        error instanceof Error
          ? error.message
          : "Request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}