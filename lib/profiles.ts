import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "@/lib/mongodb";

/**
 * Player profiles: an optional display name and profile photo.
 *
 * Photos are stored on this server’s disk (UPLOAD_DIR, default ./.data/uploads),
 * not in /public, so uploads made while the app is running are served
 * immediately, in development and production alike.
 */

export type Profile = {
  _id: string;
  displayName?: string;
  avatar?: { file: string; type: string; version: number };
  updatedAt: Date;
};

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const TYPES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/png", ext: "png", test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/jpeg", ext: "jpg", test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/webp", ext: "webp", test: b => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export const profiles = () => getDatabase().collection<Profile>("profiles");

function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), ".data", "uploads"), "avatars");
}

export async function getProfile(userId: string) {
  return profiles().findOne({ _id: userId });
}

export async function getProfiles(userIds: string[]) {
  const list = await profiles().find({ _id: { $in: userIds } }).toArray();
  return new Map(list.map(profile => [profile._id, profile]));
}

export function avatarUrl(profile: Pick<Profile, "_id" | "avatar"> | null | undefined) {
  return profile?.avatar ? `/api/avatars/${profile._id}?v=${profile.avatar.version}` : null;
}

/** Letters, numbers, spaces and . _ - ; 2–24 characters. */
export function validDisplayName(value: string) {
  return /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,22}[\p{L}\p{N}]$/u.test(value) && !/\s{2,}/.test(value);
}

export async function displayNameTaken(userId: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(await profiles().findOne({ _id: { $ne: userId }, displayName: { $regex: `^${escaped}$`, $options: "i" } }));
}

export async function setDisplayName(userId: string, name: string | null) {
  await profiles().updateOne(
    { _id: userId },
    name ? { $set: { displayName: name, updatedAt: new Date() } } : { $unset: { displayName: "" }, $set: { updatedAt: new Date() } },
    { upsert: true },
  );
}

/** Checks the real file type from its bytes; the browser’s claimed type is ignored. */
export function sniffImage(bytes: Buffer) {
  return TYPES.find(item => item.test(bytes)) ?? null;
}

export async function saveAvatar(userId: string, bytes: Buffer) {
  const kind = sniffImage(bytes);
  if (!kind) throw new Error("Use a PNG, JPEG or WebP image.");
  if (bytes.length > MAX_AVATAR_BYTES) throw new Error("Use an image under 2 MB.");
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const file = `${userId}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  await writeFile(path.join(dir, file), bytes, { mode: 0o600 });
  const previous = await getProfile(userId);
  await profiles().updateOne(
    { _id: userId },
    { $set: { avatar: { file, type: kind.type, version: Date.now() }, updatedAt: new Date() } },
    { upsert: true },
  );
  if (previous?.avatar) await unlink(path.join(dir, path.basename(previous.avatar.file))).catch(() => {});
}

export async function removeAvatar(userId: string) {
  const previous = await getProfile(userId);
  await profiles().updateOne({ _id: userId }, { $unset: { avatar: "" }, $set: { updatedAt: new Date() } });
  if (previous?.avatar) await unlink(path.join(uploadDir(), path.basename(previous.avatar.file))).catch(() => {});
}

export async function readAvatar(userId: string) {
  const profile = await getProfile(userId);
  if (!profile?.avatar) return null;
  const bytes = await readFile(path.join(uploadDir(), path.basename(profile.avatar.file))).catch(() => null);
  return bytes ? { bytes, type: profile.avatar.type } : null;
}
