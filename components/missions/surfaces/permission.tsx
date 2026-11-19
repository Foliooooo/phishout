"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertTriangleIcon, Icon, LaptopIcon, MicOnIcon, MultipleCrossCancelIcon, NotificationBellOnIcon, PlayCircleIcon,
  TvIcon, UploadUpIcon, VideoCallIcon,
} from "../icon";
import { play } from "../sfx";
import { Avatar, InspectButton } from "./shared";

const TILES = ["/missions/photos/stream-bear.jpg", "/missions/photos/stream-kayak.jpg", "/missions/photos/stream-street.jpg"];

const ADS = ["Your PC is infected with 5 viruses", "Congratulations! You won a phone", "Speed up your computer now", "Claim your $500 reward"];

const permissionIcon = (subject: string) => /notif/i.test(subject) ? NotificationBellOnIcon : /mic/i.test(subject) ? MicOnIcon : LaptopIcon;

/** Pop-up Panic: a streaming site, a call and an upload page, each asking the browser for something. */
function PermissionSurface({ view, scene, site, busy, opened, open, start, inspect, act }: SurfaceProps) {
  const still = useReducedMotion();
  const movie = scene?.address.startsWith("free-movies");
  const [ads, setAds] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [adStep, setAdStep] = useState(view.step);
  if (adStep !== view.step) {
    setAdStep(view.step);
    setAds([]);
  }

  useEffect(() => {
    if (!movie || !opened || still) return;
    let id = 0;
    const timer = setInterval(() => {
      id += 1;
      play("alarm");
      setAds(list => [...list.slice(-3), { id, text: ADS[id % ADS.length], x: 10 + Math.random() * 50, y: 20 + Math.random() * 45 }]);
    }, 1800);
    return () => clearInterval(timer);
  }, [movie, opened, still]);

  if (!scene) {
    return (
      <div className="h-full overflow-y-auto bg-[#141414] text-white">
        <header className="flex h-14 items-center gap-6 px-6">
          <span className="flex items-center gap-2 text-[18px] font-bold text-[#e50914]"><Icon icon={TvIcon} size={20} />{site.name}</span>
          <nav className="hidden gap-5 text-[13px] text-[#b3b3b3] sm:flex"><span className="text-white">Home</span><span>Films</span><span>Series</span><span>My list</span></nav>
        </header>
        <div className="px-6">
          <div className="relative flex aspect-[21/8] items-end overflow-hidden rounded-md bg-[#1f1f1f] p-6">
            <Image src="/missions/photos/stream-city-night.jpg" alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover" priority />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            <div className="relative">
              <p className="text-[12px] text-[#b3b3b3]">{site.intro}</p>
              <h2 className="mt-1 text-[28px] font-bold">{site.rows[0]?.[1] ?? "City after dark"}</h2>
              <button type="button" disabled={busy} onClick={start} className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-white px-5 text-[14px] font-semibold text-black hover:bg-white/85">
                <Icon icon={PlayCircleIcon} size={18} />{site.task}
              </button>
            </div>
          </div>
          <p className="mt-6 text-[14px] font-semibold">Continue watching</p>
          <div className="mt-2 grid gap-3 pb-6 sm:grid-cols-3">
            {site.rows.map(([from, title, when], index) => (
              <div key={title}>
                <div className="relative aspect-video overflow-hidden rounded bg-[#1f1f1f]"><Image src={TILES[index % TILES.length]} alt="" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" /></div>
                <p className="mt-1.5 text-[13px]">{title}</p>
                <p className="text-[11px] text-[#8c8c8c]">{from} · {when}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const call = /mic|call/i.test(scene.subject + scene.surface);
  const upload = /upload|record/i.test(scene.surface);
  const host = scene.address.split("/")[0];

  return (
    <div className={cn("relative h-full overflow-hidden", call || upload ? "bg-[#202124] text-white" : "bg-black text-white")}>
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-[12px] text-white/50">{scene.surface}</p>
        {call ? (
          <div className="mt-4 grid w-full max-w-lg grid-cols-2 gap-2">
            {["Mira", "Jo", "Avery", "You"].map(name => (
              <div key={name} className="relative flex aspect-video flex-col items-center justify-center gap-2 rounded-lg bg-[#3c4043] text-[13px] font-medium">
                <Avatar name={name} size={48} />
                {name}
                {name === "You" && <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-[#ea4335]"><Icon icon={MicOnIcon} size={13} /></span>}
              </div>
            ))}
          </div>
        ) : upload ? (
          <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-white/25 p-8">
            <Icon icon={UploadUpIcon} size={28} className="text-white/60" />
            <p className="text-[14px]">Recording ready to share</p>
            <p className="text-[12px] text-white/50">team-sync-recording.mp4</p>
          </div>
        ) : (
          <div className="relative mt-4 flex aspect-video w-full max-w-2xl items-center justify-center overflow-hidden rounded bg-[#111]">
            <Image src="/missions/photos/stream-city-night.jpg" alt="" fill sizes="672px" className="object-cover opacity-40" />
            {opened ? <span className="relative size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" aria-label="Loading video" /> : null}
          </div>
        )}
        {!opened && scene.entry && (
          <button type="button" onClick={open} className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black hover:bg-white/85">
            <Icon icon={call ? MicOnIcon : upload ? VideoCallIcon : PlayCircleIcon} size={18} />{scene.entry}
          </button>
        )}
      </div>

      <AnimatePresence>
        {ads.map(ad => (
          <motion.div
            key={ad.id}
            className="absolute z-10 w-60 rounded border-2 border-[#ff0000] bg-[#ffff66] p-3 text-left text-[13px] font-bold text-[#cc0000] shadow-xl"
            style={{ left: `${ad.x}%`, top: `${ad.y}%` }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <button type="button" aria-label="Close ad" onClick={() => setAds(list => list.filter(entry => entry.id !== ad.id))} className="float-right -mt-1 -mr-1 text-black/60 hover:text-black">
              <Icon icon={MultipleCrossCancelIcon} size={14} />
            </button>
            <span className="flex items-start gap-1.5"><Icon icon={AlertTriangleIcon} size={16} className="shrink-0" />{ad.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {opened && (
          <motion.div
            role="dialog"
            aria-label={`${host} wants to ${scene.subject}`}
            className="absolute top-1 left-2 z-20 w-[min(360px,calc(100%-1rem))] rounded-lg bg-white p-4 text-left text-[#202124] shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-[14px]"><b className="font-semibold">{host}</b> wants to</p>
            <p className="mt-3 flex items-center gap-3 text-[14px]">
              <Icon icon={permissionIcon(scene.subject)} size={18} className="text-[#5f6368]" />
              {scene.subject.replace(/\?$/, "")}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#5f6368]">{scene.message}</p>
            <div className="mt-3"><InspectButton scene={scene} onInspect={inspect} busy={busy} /></div>
            <div className="mt-4 flex justify-end gap-2">
              {scene.actions.map((label, index) => (
                <button key={label} type="button" disabled={busy} onClick={() => act(index)} className="h-9 rounded-full border border-[#dadce0] px-4 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f6fafe] disabled:opacity-50">
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const permissionSkin: Skin = {
  accent: "#f87171",
  tabTitle: view => (view.scene ? view.scene.surface : `${view.site.name} – Home`),
  tabIcon: <Icon icon={TvIcon} size={14} className="text-[#e50914]" />,
  Surface: PermissionSurface,
};
