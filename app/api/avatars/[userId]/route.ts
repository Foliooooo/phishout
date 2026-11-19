import { readAvatar } from "@/lib/profiles";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serves a player's uploaded profile photo from local disk. */
export async function GET(_request: Request, { params }: RouteContext<"/api/avatars/[userId]">) {
  const { userId } = await params;
  if (!uuid.test(userId)) return new Response(null, { status: 404 });
  const avatar = await readAvatar(userId).catch(() => null);
  if (!avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(avatar.bytes), {
    headers: {
      "Content-Type": avatar.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
