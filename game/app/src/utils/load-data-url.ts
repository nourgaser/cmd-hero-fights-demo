const LOAD_DATA_FLAG_KEY = 'loadData'
const LOAD_DATA_PAYLOAD_KEY = 'data'

type LoadDataPayloadV1 = {
  version: 1
  storage: Record<string, string>
}

type LoadDataPayload = LoadDataPayloadV1

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlDecode(value: string): string {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')

  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeLoadDataPayload(payload: LoadDataPayload): string {
  return base64UrlEncode(JSON.stringify(payload))
}

function decodeLoadDataPayload(encoded: string): LoadDataPayload | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as LoadDataPayload
    if (parsed.version !== 1 || !parsed.storage || typeof parsed.storage !== 'object') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function createLoadDataShareUrl(options: {
  storageKeys: string[]
}): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storage: Record<string, string> = {}
  for (const key of options.storageKeys) {
    const value = window.localStorage.getItem(key)
    if (value !== null) {
      storage[key] = value
    }
  }

  const payload: LoadDataPayload = {
    version: 1,
    storage,
  }

  const params = new URLSearchParams(window.location.search)
  params.set(LOAD_DATA_FLAG_KEY, 'true')
  params.set(LOAD_DATA_PAYLOAD_KEY, encodeLoadDataPayload(payload))

  const query = params.toString()
  const search = query ? `?${query}` : ''
  return `${window.location.origin}${window.location.pathname}${search}${window.location.hash}`
}

export function applyLoadDataFromLocation(options: {
  storageKeys: string[]
}): {
  applied: boolean
  importedKeyCount: number
  error?: string
} {
  if (typeof window === 'undefined') {
    return { applied: false, importedKeyCount: 0 }
  }

  const params = new URLSearchParams(window.location.search)
  const shouldLoad = params.get(LOAD_DATA_FLAG_KEY) === 'true'
  if (!shouldLoad) {
    return { applied: false, importedKeyCount: 0 }
  }

  const encodedPayload = params.get(LOAD_DATA_PAYLOAD_KEY)

  params.delete(LOAD_DATA_FLAG_KEY)
  params.delete(LOAD_DATA_PAYLOAD_KEY)
  const query = params.toString()
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)

  if (!encodedPayload) {
    return {
      applied: false,
      importedKeyCount: 0,
      error: 'No loadData payload was provided.',
    }
  }

  const payload = decodeLoadDataPayload(encodedPayload)
  if (!payload) {
    return {
      applied: false,
      importedKeyCount: 0,
      error: 'loadData payload is invalid or corrupted.',
    }
  }

  for (const key of options.storageKeys) {
    window.localStorage.removeItem(key)
  }

  let importedKeyCount = 0
  for (const key of options.storageKeys) {
    const value = payload.storage[key]
    if (typeof value === 'string') {
      window.localStorage.setItem(key, value)
      importedKeyCount += 1
    }
  }

  return {
    applied: true,
    importedKeyCount,
  }
}
