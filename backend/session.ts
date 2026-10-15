import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { firebaseCredentials, firestoreConfigured } from './recordStore.js';

const localSecret = randomBytes(32);
const key = () => firestoreConfigured() ? firebaseCredentials().privateKey : localSecret;
export interface SessionUser { id: string; email: string; role: string; }

export function createSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({...user,exp:Math.floor(Date.now()/1000)+60*60*24})).toString('base64url');
  return `${payload}.${createHmac('sha256',key()).update(payload).digest('base64url')}`;
}

export function readSession(token: string): SessionUser | null {
  try {
    const [payload,signature,...rest] = token.split('.');
    if (!payload || !signature || rest.length) return null;
    const expected = createHmac('sha256',key()).update(payload).digest();
    const actual = Buffer.from(signature,'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected,actual)) return null;
    const user = JSON.parse(Buffer.from(payload,'base64url').toString());
    if (user.exp <= Math.floor(Date.now()/1000) || !user.email || !user.id || !['admin','employee'].includes(user.role)) return null;
    return {id:user.id,email:String(user.email).toLowerCase(),role:user.role};
  } catch { return null; }
}
