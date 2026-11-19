import { createHmac, randomInt, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { MongoServerError, type Filter } from "mongodb";
import { sendAuthCode, type AuthCodePurpose } from "@/lib/email/auth-mail";
import { getDatabase } from "@/lib/mongodb";

const dummySalt = "00000000000000000000000000000000";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

type Account = {
  _id: string;
  userId: string;
  salt: string;
  passwordHash: string;
  createdAt: Date;
  emailVerifiedAt?: Date | null;
  passwordChangedAt?: Date;
  verify?: AccountProof;
  reset?: AccountProof;
};

type AccountProof = {
  hash: string;
  expiresAt: Date;
  retryAt: Date;
  remaining: number;
};

const accounts = () => getDatabase().collection<Account>("credentials");

function codeHash(email: string, purpose: AuthCodePurpose, code: string) {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("Authentication secret is missing");
  return createHmac("sha256", key).update(JSON.stringify([email, purpose, code])).digest("hex");
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

export async function createAccount(email: string, password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await derive(password, salt)).toString("hex");

  try {
    await accounts().insertOne({
      _id: email,
      userId: randomUUID(),
      salt,
      passwordHash,
      createdAt: new Date(),
      emailVerifiedAt: null,
    });
    return true;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return false;
    throw error;
  }
}

export async function verifyAccount(email: string, password: string, allowPending = false) {
  const account = await accounts().findOne({ _id: email });
  const actual = await derive(password, account?.salt ?? dummySalt);
  const expected = account ? Buffer.from(account.passwordHash, "hex") : Buffer.alloc(64);
  if (!timingSafeEqual(actual, expected) || !account) return null;

  const pending = account.emailVerifiedAt === null;
  if (!allowPending && pending) return null;
  return {
    id: account.userId,
    email: account._id,
    pending,
    passwordVersion: account.passwordChangedAt?.getTime() ?? 0,
  };
}

export async function getPasswordVersion(email: string) {
  const account = await accounts().findOne({ _id: email }, { projection: { passwordChangedAt: 1 } });
  return account ? account.passwordChangedAt?.getTime() ?? 0 : null;
}

export async function requestAccountCode(email: string, purpose: AuthCodePurpose) {
  const code = String(randomInt(100_000_000)).padStart(8, "0");
  const now = Date.now();
  const proof = {
    hash: codeHash(email, purpose, code),
    expiresAt: new Date(now + 10 * 60_000),
    retryAt: new Date(now + 60_000),
    remaining: 5,
  };
  const updated = await accounts().updateOne({
    _id: email,
    ...(purpose === "verify" ? { emailVerifiedAt: { $type: "null" } } : {}),
    $or: [{ [purpose]: { $exists: false } }, { [`${purpose}.retryAt`]: { $lte: new Date(now) } }],
  }, { $set: { [purpose]: proof } });

  if (!updated.matchedCount) return;
  try {
    await sendAuthCode(email, code, purpose);
  } catch (error) {
    await accounts().updateOne({ _id: email, [`${purpose}.hash`]: proof.hash }, { $unset: { [purpose]: "" } });
    throw error;
  }
}

export async function completeAccountCode(
  email: string,
  purpose: AuthCodePurpose,
  code: string,
  password: string,
) {
  const account = purpose === "verify" ? await verifyAccount(email, password, true) : null;
  if (purpose === "verify" && !account?.pending) return false;

  const now = new Date();
  const lookup: Filter<Account> = {
    _id: email,
    [`${purpose}.expiresAt`]: { $gt: now },
    [`${purpose}.remaining`]: { $gt: 0 },
    ...(purpose === "verify" ? { emailVerifiedAt: { $type: "null" } } : {}),
  };
  const hash = codeHash(email, purpose, code);
  const exact = { ...lookup, [`${purpose}.hash`]: hash };
  if (!(await accounts().findOne(exact, { projection: { _id: 1 } }))) {
    await accounts().updateOne({ ...lookup, [`${purpose}.hash`]: { $ne: hash } }, { $inc: { [`${purpose}.remaining`]: -1 } });
    return false;
  }

  const salt = purpose === "reset" ? randomBytes(16).toString("hex") : "";
  const fields = purpose === "reset"
    ? { salt, passwordHash: (await derive(password, salt)).toString("hex"), passwordChangedAt: now, emailVerifiedAt: now }
    : { emailVerifiedAt: now };

  const used = await accounts().updateOne(
    exact,
    { $set: fields, $unset: purpose === "reset" ? { reset: "", verify: "" } : { verify: "" } },
  );
  return used.matchedCount === 1;
}
