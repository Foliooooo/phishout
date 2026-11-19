import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { MongoServerError } from "mongodb";
import { getPasswordVersion } from "@/lib/accounts";
import { getDatabase } from "@/lib/mongodb";
import { isSuperAdmin } from "@/lib/levels";

export const adminEmail = "harshit@folioo.tech";
export const adminChallengeCookie = "phish-admin-challenge";
export const adminSessionCookie = "phish-admin-session";
export const adminChallengeSeconds = 600;
export const adminSessionSeconds = 1800;

type AdminAccess = {
  _id: string;
  passwordRetryAt?: Date;
  codeRetryAt?: Date;
  challenge?: { tokenHash: string; codeHash: string; expiresAt: Date; remaining: number; passwordVersion: number };
  grant?: { tokenHash: string; expiresAt: Date; passwordVersion: number };
};

const access = () => getDatabase().collection<AdminAccess>("admin_access");
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const freshToken = () => randomBytes(32).toString("hex");

function codeHash(token: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", process.env.AUTH_SECRET).update(`admin:${token}:${code}`).digest("hex");
}

export async function allowAdminPasswordAttempt() {
  const now = new Date();
  try {
    const result = await access().updateOne({
      _id: adminEmail,
      $or: [{ passwordRetryAt: { $exists: false } }, { passwordRetryAt: { $lte: now } }],
    }, { $set: { passwordRetryAt: new Date(now.getTime() + 3_000) } }, { upsert: true });
    return Boolean(result.matchedCount || result.upsertedCount);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return false;
    throw error;
  }
}

export async function createAdminChallenge(passwordVersion: number) {
  const token = freshToken();
  const code = String(randomInt(100_000_000)).padStart(8, "0");
  const now = new Date();
  const updated = await access().updateOne({
    _id: adminEmail,
    $or: [{ codeRetryAt: { $exists: false } }, { codeRetryAt: { $lte: now } }],
  }, {
    $set: {
      codeRetryAt: new Date(now.getTime() + 60_000),
      challenge: {
        tokenHash: tokenHash(token),
        codeHash: codeHash(token, code),
        expiresAt: new Date(now.getTime() + adminChallengeSeconds * 1000),
        remaining: 5,
        passwordVersion,
      },
    },
  });
  return updated.matchedCount ? { token, code } : null;
}

const challengeLookup = (token: string) => ({
  _id: adminEmail,
  "challenge.tokenHash": tokenHash(token),
  "challenge.expiresAt": { $gt: new Date() },
  "challenge.remaining": { $gt: 0 },
});

export async function discardAdminChallenge(token: string) {
  await access().updateOne({ _id: adminEmail, "challenge.tokenHash": tokenHash(token) }, { $unset: { challenge: "" } });
}

export async function hasAdminChallenge(token?: string) {
  return Boolean(token && await access().findOne(challengeLookup(token), { projection: { _id: 1 } }));
}

export async function verifyAdminCode(token: string, code: string) {
  const passwordVersion = await getPasswordVersion(adminEmail);
  if (passwordVersion === null) return null;
  const lookup = { ...challengeLookup(token), "challenge.passwordVersion": passwordVersion };
  const hash = codeHash(token, code);
  const session = freshToken();
  const used = await access().updateOne({ ...lookup, "challenge.codeHash": hash }, {
    $unset: { challenge: "" },
    $set: { grant: { tokenHash: tokenHash(session), passwordVersion, expiresAt: new Date(Date.now() + adminSessionSeconds * 1000) } },
  });
  if (used.matchedCount) return session;
  await access().updateOne({ ...lookup, "challenge.codeHash": { $ne: hash } }, { $inc: { "challenge.remaining": -1 } });
  return null;
}

/** Super-admin accounts get admin tools whenever they’re signed in. */
async function signedInSuperAdmin() {
  const { auth } = await import("@/auth");
  const session = await auth().catch(() => null);
  return isSuperAdmin(session?.user.email);
}

export async function hasAdminSession(token?: string) {
  if (await signedInSuperAdmin()) return true;
  if (!token) return false;
  const record = await access().findOne({
    _id: adminEmail, "grant.tokenHash": tokenHash(token), "grant.expiresAt": { $gt: new Date() },
  });
  return Boolean(record?.grant && record.grant.passwordVersion === await getPasswordVersion(adminEmail));
}

export async function revokeAdminSession(token: string) {
  await access().updateOne({ _id: adminEmail, "grant.tokenHash": tokenHash(token) }, { $unset: { grant: "" } });
}
