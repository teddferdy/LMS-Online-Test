class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'lms_token'
const USER_KEY = 'lms_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getUser(): unknown {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

interface RequestOptions {
  method?: string
  body?: unknown
  isFormData?: boolean
  headers?: Record<string, string>
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, isFormData = false, headers = {} } = options

  const token = getToken()
  const requestHeaders: Record<string, string> = {
    ...headers,
  }
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }
  if (body !== undefined && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as BodyInit)
          : JSON.stringify(body),
  })

  if (res.status === 401) {
    clearAuth()
    throw new ApiError('Sesi berakhir, silakan login kembali', 401)
  }

  if (!res.ok) {
    let message = `Terjadi kesalahan (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) {
        message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return (await res.text()) as unknown as T
}
