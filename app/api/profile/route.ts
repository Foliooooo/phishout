import { auth } from "@/auth";
import {
  MAX_AVATAR_BYTES, avatarUrl, displayNameTaken, getProfile, removeAvatar, saveAvatar, setDisplayName, validDisplayName,
} from "@/lib/profiles";

/**
 * Update the signed-in player's profile (multipart form):
 *   displayName  optional text; empty clears it
 *   avatar       optional PNG/JPEG/WebP file, up to 2 MB
 *   removeAvatar "1" to delete the current photo
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId || !session.sessionId) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_AVATAR_BYTES + 64_000) {
    return Response.json({ error: "Use an image under 2 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Couldn’t read the form." }, { status: 400 });
  }

  try {
    const name = form.get("displayName");
    if (typeof name === "string") {
      const trimmed = name.trim().replace(/\s+/g, " ");
      if (trimmed && !validDisplayName(trimmed)) {
        return Response.json({ error: "Use 2–24 letters, numbers, spaces, dots, dashes or underscores." }, { status: 400 });
      }
      if (trimmed && await displayNameTaken(userId, trimmed)) {
        return Response.json({ error: "That name is taken. Try another." }, { status: 409 });
      }
      await setDisplayName(userId, trimmed || null);
    }

    if (form.get("removeAvatar") === "1") await removeAvatar(userId);
    const file = form.get("avatar");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) return Response.json({ error: "Use an image under 2 MB." }, { status: 413 });
      await saveAvatar(userId, Buffer.from(await file.arrayBuffer()));
    }

    const profile = await getProfile(userId);
    return Response.json({ displayName: profile?.displayName ?? null, avatar: avatarUrl(profile) });
  } catch (error) {
    if (error instanceof Error && /^Use /.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    console.error("Profile update failed", error);
    return Response.json({ error: "Couldn’t save your profile. Try again." }, { status: 503 });
  }
}
