import { createCipheriv, createDecipheriv, randomBytes, scrypt, hkdfSync } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)

// ─── Validação na inicialização ───────────────────────────────────────────────

const RAW_KEY = process.env.ENCRYPTION_KEY
if (!RAW_KEY || RAW_KEY.length !== 64) {
throw new Error("ENCRYPTION_KEY ausente ou inválida — gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"")
}
const MASTER_KEY = Buffer.from(RAW_KEY, "hex")

// ─── Derivação de chave ───────────────────────────────────────────────────────

/\*\*

- Deriva uma chave AES-256 isolada por conversa.
-
- Estratégia dual:
- - scrypt → chaves de longa duração (conversas existentes)
- - HKDF → chaves efêmeras ou rotacionadas (novas conversas / v2+)
-
- O prefixo no dado cifrado ("s1:" / "h1:") determina qual caminho usar na decifração.
  \*/

async function deriveKeyScrypt(conversationId: string): Promise<Buffer> {
return scryptAsync(MASTER_KEY, conversationId, 32) as Promise<Buffer>
}

function deriveKeyHkdf(conversationId: string): Buffer {
return Buffer.from(
hkdfSync("sha256", MASTER_KEY, conversationId, "dm-encryption-v1", 32)
)
}

// ─── Versões de esquema ───────────────────────────────────────────────────────

type SchemeVersion = "s1" | "h1"

const CURRENT_SCHEME: SchemeVersion = (process.env.ENCRYPTION_SCHEME as SchemeVersion) ?? "h1"

async function deriveKey(conversationId: string, scheme: SchemeVersion): Promise<Buffer> {
return scheme === "s1"
? deriveKeyScrypt(conversationId)
: deriveKeyHkdf(conversationId)
}

// ─── Cifrar ───────────────────────────────────────────────────────────────────

/\*\*

- Cifra texto com AES-256-GCM.
-
- Formato do dado armazenado:
- "<scheme>:<base64( iv[12] + authTag[16] + ciphertext )>"
-
- Exemplos:
- "h1:abc123..." → HKDF (esquema atual)
- "s1:xyz789..." → scrypt (mensagens legadas)
  \*/
  export async function encrypt(text: string, conversationId: string): Promise<string> {
  const key = await deriveKey(conversationId, CURRENT_SCHEME)
  const iv = randomBytes(12)

const cipher = createCipheriv("aes-256-gcm", key, iv)
const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
const tag = cipher.getAuthTag()

const payload = Buffer.concat([iv, tag, encrypted]).toString("base64")
return `${CURRENT_SCHEME}:${payload}`
}

// ─── Decifrar ─────────────────────────────────────────────────────────────────

/\*\*

- Decifra e autentica.
- Detecta automaticamente o esquema pelo prefixo — compatível com mensagens legadas.
- Lança erro se o authTag falhar (dado adulterado ou chave errada).
  \*/
  export async function decrypt(data: string, conversationId: string): Promise<string> {
  const colonIdx = data.indexOf(":")
  const scheme = (colonIdx !== -1 ? data.slice(0, colonIdx) : "s1") as SchemeVersion
  const payload = colonIdx !== -1 ? data.slice(colonIdx + 1) : data // fallback sem prefixo

const key = await deriveKey(conversationId, scheme)
const buf = Buffer.from(payload, "base64")

const iv = buf.subarray(0, 12)
const tag = buf.subarray(12, 28)
const encrypted = buf.subarray(28)

const decipher = createDecipheriv("aes-256-gcm", key, iv)
decipher.setAuthTag(tag)

return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

// ─── Migração (scrypt → HKDF) ─────────────────────────────────────────────────

/\*\*

- Re-cifra mensagens legadas (s1:) para o esquema atual (h1:).
- Usar em job de migração — nunca no caminho crítico de leitura.
-
- Exemplo de uso:
- const newContent = await migrate(msg.content, msg.conversationId)
- if (newContent) await db.message.update({ where: { id: msg.id }, data: { content: newContent } })
-
- Retorna null se o dado já estiver no esquema atual.
  \*/
  export async function migrate(data: string, conversationId: string): Promise<string | null> {
  const scheme = data.startsWith("s1:") ? "s1" : null
  if (!scheme || CURRENT_SCHEME === scheme) return null

const plaintext = await decrypt(data, conversationId)
return encrypt(plaintext, conversationId)
}
