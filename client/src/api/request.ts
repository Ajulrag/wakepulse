function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getFieldErrors(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value) || !isRecord(value.errors)) {
    return null
  }

  const fieldErrors = Object.fromEntries(
    Object.entries(value.errors).flatMap(([field, messages]) => {
      if (!Array.isArray(messages)) {
        return []
      }

      const safeMessages = messages.filter(
        (message): message is string => typeof message === 'string',
      )

      return safeMessages.length > 0 ? [[field, safeMessages]] : []
    }),
  )

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
}

function getResponseMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.message === 'string') {
    const message = payload.message.trim()

    if (message.length > 0 && !/\n\s*(at\s|in\s)/i.test(message)) {
      return message
    }
  }

  return `The request failed with status ${status}.`
}

export class ApiRequestError extends Error {
  readonly status: number | null
  readonly fieldErrors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number | null,
    fieldErrors: Record<string, string[]> | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Sends a JSON API request using the server-managed HTTP-only auth cookie. */
export async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers,
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiRequestError(
      'Unable to connect to the WakePulse API.',
      null,
      null,
      { cause },
    )
  }

  let payload: unknown = null

  if (response.status !== 204) {
    try {
      payload = await response.json()
    } catch (cause) {
      if (response.ok) {
        throw new ApiRequestError(
          'The WakePulse API returned an invalid JSON response.',
          response.status,
          null,
          { cause },
        )
      }
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      getResponseMessage(payload, response.status),
      response.status,
      getFieldErrors(payload),
    )
  }

  return payload
}
