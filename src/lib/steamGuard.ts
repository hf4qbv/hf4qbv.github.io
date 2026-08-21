const SYMBOLS = '23456789BCDFGHJKMNPQRTVWXY'

export const CODE_PERIOD = 30

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.trim().replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function isValidSecret(secret: string): boolean {
  if (!secret.trim()) return false
  try {
    return base64ToBytes(secret).length > 0
  } catch {
    return false
  }
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource)
  return new Uint8Array(signature)
}

export async function generateSteamGuardCode(
  sharedSecret: string,
  timestampSeconds: number,
): Promise<string> {
  const key = base64ToBytes(sharedSecret)
  const timeSlice = Math.floor(timestampSeconds / CODE_PERIOD)

  const message = new Uint8Array(8)
  let value = timeSlice
  for (let i = 7; i >= 0; i--) {
    message[i] = value % 256
    value = Math.floor(value / 256)
  }

  const digest = await hmacSha1(key, message)
  const offset = digest[19] & 0xf

  let full =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  full >>>= 0
  full &= 0x7fffffff

  let code = ''
  for (let i = 0; i < 5; i++) {
    code += SYMBOLS[full % SYMBOLS.length]
    full = Math.floor(full / SYMBOLS.length)
  }
  return code
}
