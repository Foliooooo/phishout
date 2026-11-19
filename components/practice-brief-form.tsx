"use client";

import { useActionState } from "react";
import { generatePracticeBrief } from "@/app/admin/practice-actions";
import { Button } from "@/components/ui/button";
import { skillNames } from "@/lib/learning";

export function PracticeBriefForm() {
  const [error, action, pending] = useActionState(generatePracticeBrief, "");

  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 font-bold">
        Skill to practise
        <select name="skill" className="min-h-11 rounded-2xl bg-paper-raised px-3">
          {skillNames.map(skill => <option key={skill}>{skill}</option>)}
        </select>
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Drafting…" : "Draft with Gemini"}</Button>
      {error && <p className="w-full" role="alert">{error}</p>}
    </form>
  );
}
