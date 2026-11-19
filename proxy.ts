import { auth } from "@/auth";
import { getGameDestination } from "@/lib/games";
import { NextResponse } from "next/server";

export const proxy = auth((request) => {
  if (request.auth?.user.id && request.auth.sessionId) {
    const destination = getGameDestination(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(destination, request.nextUrl), 303);
  }
});

export const config = {
  matcher: ["/sign-in", "/sign-up", "/verify-email", "/reset-password"],
};
