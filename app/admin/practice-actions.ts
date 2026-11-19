"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSessionCookie, hasAdminSession } from "@/lib/admin";
import { draftPracticeBrief, practiceBriefs } from "@/lib/practice-briefs";

async function requireAdmin() {
  if (!await hasAdminSession((await cookies()).get(adminSessionCookie)?.value)) redirect("/admin");
}

export async function generatePracticeBrief(_state: string, form: FormData) {
  await requireAdmin();
  try {
    const brief = await draftPracticeBrief(String(form.get("skill") ?? ""));
    await practiceBriefs().updateOne({ _id: "featured" }, {
      $set: { draft: { ...brief, revision: randomUUID() } },
    }, { upsert: true });
  } catch (error) {
    if (error instanceof Error && /^(Set GEMINI|Choose a skill|GEMINI_MODEL|Gemini returned)/.test(error.message)) return error.message;
    return "Couldn’t generate a draft. Try again in a moment.";
  }
  redirect("/admin#practice-brief");
}

export async function publishPracticeBrief(form: FormData) {
  await requireAdmin();
  const revision = form.get("revision");
  if (typeof revision === "string") {
    await practiceBriefs().updateOne({ _id: "featured", "draft.revision": revision }, [
      { $set: { published: "$draft" } }, { $unset: "draft" },
    ]);
  }
  redirect("/admin#practice-brief");
}
