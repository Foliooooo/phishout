"use client";

import { Icon } from "@/components/missions/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckTickCircleIcon, DeleteDustbin01Icon, UploadUpIcon, UserIcon } from "@pikaicons/core-free";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const MAX_BYTES = 2 * 1024 * 1024;

export function ProfileForm({ initialName, initialAvatar, alias }: { initialName: string; initialAvatar: string | null; alias: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialAvatar);
  const [remove, setRemove] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Release the object URL for a picked file when it changes.
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (picked: File | undefined) => {
    setStatus(null);
    if (!picked) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(picked.type)) return setStatus({ tone: "error", text: "Use a PNG, JPEG or WebP image." });
    if (picked.size > MAX_BYTES) return setStatus({ tone: "error", text: "Use an image under 2 MB." });
    setFile(picked);
    setRemove(false);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const body = new FormData();
    body.set("displayName", name);
    if (file) body.set("avatar", file);
    if (remove) body.set("removeAvatar", "1");
    const response = await fetch("/api/profile", { method: "POST", body }).catch(() => null);
    const result = await response?.json().catch(() => null);
    setSaving(false);
    if (!response?.ok) return setStatus({ tone: "error", text: result?.error ?? "Couldn’t save your profile." });
    setFile(null);
    setRemove(false);
    setPreview(result.avatar);
    setName(result.displayName ?? "");
    setStatus({ tone: "ok", text: "Profile saved." });
    router.refresh();
  };

  const dirty = name.trim() !== initialName || Boolean(file) || remove;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); pick(event.dataTransfer.files[0]); }}
          className="group relative size-28 shrink-0 overflow-hidden rounded-full bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          aria-label="Choose a profile photo"
        >
          {preview && !remove ? (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads and blob previews
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-ink-soft"><Icon icon={UserIcon} size={44} strokeWidth={1.5} /></span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-paper opacity-0 transition-opacity group-hover:opacity-100">
            <Icon icon={UploadUpIcon} size={22} />
          </span>
        </button>
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => pick(event.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
              <Icon icon={UploadUpIcon} size={16} />Upload photo
            </Button>
            {(preview || file) && !remove && (
              <Button type="button" variant="raised" size="sm" onClick={() => { setRemove(true); setFile(null); }}>
                <Icon icon={DeleteDustbin01Icon} size={16} />Remove
              </Button>
            )}
          </div>
          <p className="text-sm text-ink-soft">PNG, JPEG or WebP, up to 2 MB. Drop an image on the circle, or click it.</p>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-bold">Display name</span>
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          maxLength={24}
          placeholder={alias}
          className="depth-sunken mt-2 block h-12 w-full rounded-2xl bg-paper-deep px-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-ink"
        />
        <span className="mt-1.5 block text-sm text-ink-soft">Shown on the leaderboard. Leave it empty to stay anonymous as {alias}.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !dirty}>{saving ? "Saving…" : "Save profile"}</Button>
        {status && (
          <p role="status" className={cn("flex items-center gap-1.5 text-sm font-bold", status.tone === "ok" ? "text-safe" : "text-danger")}>
            {status.tone === "ok" && <Icon icon={CheckTickCircleIcon} size={16} />}{status.text}
          </p>
        )}
      </div>
    </form>
  );
}
