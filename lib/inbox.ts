import crypto from 'node:crypto';
import { listPush, listRange, get, put } from './store';
import { signToken, verifyToken } from './auth';

/**
 * Kotak masuk internal.
 *
 * Alamat dibuat oleh sistem (bukan email sungguhan) dan hanya bisa dibuka oleh
 * pemilik cookie sesi yang ditandatangani. Notifikasi yang tersimpan di sini
 * dihasilkan oleh sistem ini sendiri — tidak ada koneksi ke layanan email mana pun.
 */

export const INBOX_COOKIE = 'amp_inbox';
export const INBOX_DOMAIN = 'premid.internal';
export const INBOX_TTL = 60 * 60 * 24; // alamat & pesan berlaku 24 jam
export const MAX_MESSAGES = 20;

/** Huruf bebas ambigu supaya alamat mudah dibaca/diketik ulang. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newInboxAddress(): string {
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[crypto.randomInt(0, ALPHABET.length)]).join('');
  return `AMP-${block(4)}-${block(4)}@${INBOX_DOMAIN}`;
}

/** Alamat harus berbentuk persis seperti yang dibuat newInboxAddress(). */
export function isInboxAddress(value: string): boolean {
  return new RegExp(`^AMP-[${ALPHABET}]{4}-[${ALPHABET}]{4}@${INBOX_DOMAIN.replace('.', '\\.')}$`).test(value);
}

export function signInbox(address: string): string {
  return signToken({ sub: address, eml: address, stp: 'inbox', ttlSeconds: INBOX_TTL });
}

/** Baca alamat dari cookie; null bila cookie tidak ada / tanda tangan tidak sah. */
export function addressFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const verdict = verifyToken(cookieValue);
  if (!verdict.ok) return null;
  if (verdict.payload.stp !== 'inbox') return null;
  if (!isInboxAddress(verdict.payload.eml)) return null;
  return verdict.payload.eml;
}

export type InboxMessage = {
  id: string;
  to: string;
  from: string;
  subject: string;
  plan: string;
  planName: string;
  preview: string;
  receivedAt: number;
  expiresAt: number;
  /** token & link hanya disajikan ke pemilik cookie */
  token: string;
  magicLink: string;
};

const inboxKey = (address: string) => address.toLowerCase();

export async function addMessage(address: string, msg: InboxMessage): Promise<void> {
  await put('inboxmeta', inboxKey(address), { address, createdAt: Date.now() }, INBOX_TTL);
  await listPush(`inbox:${mailboxId(address)}`, msg as unknown as Record<string, unknown>, MAX_MESSAGES, INBOX_TTL);
}

/** List bersifat global, jadi nama mailbox dibuat unik per alamat. */
function mailboxId(address: string): string {
  return crypto.createHash('sha256').update(address.toLowerCase()).digest('hex').slice(0, 12);
}

export async function listMessages(address: string): Promise<InboxMessage[]> {
  const rows = await listRange<InboxMessage>(`inbox:${mailboxId(address)}`, 0, MAX_MESSAGES - 1);
  return rows.sort((a, b) => b.receivedAt - a.receivedAt);
}

export async function inboxExists(address: string): Promise<boolean> {
  const hit = await get('inboxmeta', inboxKey(address));
  return Boolean(hit);
}

/** Versi pesan yang aman dikirim ke browser (token tidak pernah ikut). */
export type PublicInboxMessage = {
  id: string;
  from: string;
  subject: string;
  planName: string;
  preview: string;
  receivedAt: number;
  expiresAt: number;
  magicLink: string;
};

export function publicMessage(m: InboxMessage): PublicInboxMessage {
  return {
    id: m.id,
    from: m.from,
    subject: m.subject,
    planName: m.planName,
    preview: m.preview,
    receivedAt: m.receivedAt,
    expiresAt: m.expiresAt,
    magicLink: m.magicLink,
  };
}

export function newMessageId(): string {
  return `msg_${crypto.randomBytes(6).toString('hex')}`;
}
