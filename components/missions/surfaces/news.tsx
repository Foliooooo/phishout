"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRightIcon, BurgerMenuThreeIcon, GiftIcon, Icon, SearchIcon, UserCircleIcon } from "../icon";
import { InspectButton, SceneIn, destinationOf } from "./shared";

const SECTIONS = ["News", "Tech", "Culture", "City", "Perks", "Events"];
const THUMBS = ["/missions/photos/news-food.jpg", "/missions/photos/news-crowd.jpg", "/missions/photos/news-concert.jpg"];
const ARTICLE_PHOTOS = ["/missions/photos/news-perks.jpg", "/missions/photos/news-workshop.jpg", "/missions/photos/news-archive.jpg"];

/** Link Inspector: an editorial news site. Every link has to be hovered before it’s trusted. */
function NewsSurface({ view, scene, site, busy, start, inspect, act, hover }: SurfaceProps) {
  const destination = destinationOf(scene);
  const link = scene?.actions.findIndex(label => /^open/i.test(label)) ?? -1;
  const [pointing, setPointing] = useState(false);
  const pointAt = (on: boolean) => {
    setPointing(on);
    if (on && scene && !scene.inspected && !busy) inspect();
  };
  useEffect(() => hover(pointing ? destination ?? "Checking link…" : null), [pointing, destination, hover]);

  return (
    <div className="h-full overflow-y-auto bg-[#fbfaf7] font-sans text-[#121212]">
      <header className="border-b border-[#121212]">
        <div className="mx-auto flex h-10 max-w-5xl items-center gap-4 px-5 text-[12px] text-[#555]">
          <Icon icon={BurgerMenuThreeIcon} size={16} />
          <Icon icon={SearchIcon} size={15} />
          <span className="hidden sm:inline">Thursday, 19 November</span>
          <span className="ml-auto flex items-center gap-1.5"><Icon icon={UserCircleIcon} size={16} />{site.account}</span>
        </div>
        <p className="py-3 text-center font-serif text-[34px] leading-none font-bold tracking-tight">Dailybyte</p>
        <nav className="flex justify-center gap-6 border-t border-[#e2e2e2] py-2 text-[12px] font-medium">
          {SECTIONS.map(section => (
            <span key={section} className={cn(section === "Perks" && view.started ? "text-[#121212] underline underline-offset-4" : "text-[#555]")}>{section}</span>
          ))}
        </nav>
      </header>

      {!scene ? (
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-6 md:grid-cols-[1fr_280px]">
          <article>
            <div className="relative aspect-[16/8] overflow-hidden rounded-sm bg-[#e9e4da]">
              <Image src="/missions/photos/news-night-market.jpg" alt="Lanterns over a busy night street" fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover" priority />
            </div>
            <p className="mt-1 text-right text-[11px] text-[#999]">Photo: Wojtek Witkowski / Unsplash</p>
            <p className="mt-3 text-[12px] font-semibold text-[#8a6d1d] uppercase">{site.section}</p>
            <h2 className="mt-1 font-serif text-[28px] leading-tight font-bold">{site.rows[0]?.[1]}</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#444]">{site.rows[0]?.[3]}</p>
            <p className="mt-2 text-[12px] text-[#777]">{site.rows[0]?.[0]} · {site.rows[0]?.[2]}</p>
          </article>
          <aside className="space-y-5">
            <div className="rounded-md bg-white p-4 ring-1 ring-[#e2e2e2]">
              <p className="flex items-center gap-2 text-[13px] font-semibold"><Icon icon={GiftIcon} size={16} />Reader Perks</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#555]">{site.intro}</p>
              <button type="button" disabled={busy} onClick={start} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-[#121212] text-[13px] font-semibold text-white hover:bg-[#333]">
                {site.task}<Icon icon={ArrowRightIcon} size={14} />
              </button>
            </div>
            <ul className="divide-y divide-[#e2e2e2]">
              {site.rows.slice(1).map(([from, title, when], index) => (
                <li key={title} className="flex gap-3 py-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-[#e9e4da]"><Image src={THUMBS[index % THUMBS.length]} alt="" fill sizes="56px" className="object-cover" /></span>
                  <span className="min-w-0"><b className="block font-serif text-[15px] leading-snug">{title}</b><span className="text-[12px] text-[#777]">{from} · {when}</span></span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : (
        <SceneIn id={view.step} className="mx-auto max-w-[680px] px-5 py-8">
          <p className="text-[12px] font-semibold text-[#8a6d1d] uppercase">{scene.surface} · {scene.sender}</p>
          <h2 className="mt-2 font-serif text-[36px] leading-[1.1] font-bold tracking-tight">{scene.subject}</h2>
          <div className="relative mt-5 aspect-[2/1] overflow-hidden rounded-sm bg-[#e9e4da]">
            <Image src={ARTICLE_PHOTOS[view.step % ARTICLE_PHOTOS.length]} alt="" fill sizes="680px" className="object-cover" />
          </div>
          <p className="mt-4 text-[17px] leading-relaxed text-[#333]">{scene.message}</p>

          <div className="mt-8 border-y border-[#121212] py-5">
            <p className="text-[13px] text-[#555]">Choose how to continue</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              {scene.actions.map((label, index) => index === link ? (
                <button
                  key={label}
                  type="button"
                  disabled={busy}
                  onMouseEnter={() => pointAt(true)}
                  onMouseLeave={() => pointAt(false)}
                  onFocus={() => pointAt(true)}
                  onBlur={() => pointAt(false)}
                  onClick={() => act(index)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#121212] px-5 text-[14px] font-semibold text-white hover:bg-[#333] disabled:opacity-50"
                >
                  {label}<Icon icon={ArrowRightIcon} size={14} />
                </button>
              ) : (
                <button key={label} type="button" disabled={busy} onClick={() => act(index)} className="text-left text-[14px] font-medium text-[#121212] underline decoration-[#bbb] underline-offset-4 hover:decoration-[#121212] disabled:opacity-50">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <InspectButton scene={scene} onInspect={inspect} busy={busy} />
            {!scene.inspected && <span className="text-[12px] text-[#777]">Tip: hover the link and watch the bottom-left corner.</span>}
          </div>
          {destination && (
            <p className="mt-3 text-[13px] text-[#555]">Link goes to <span className="font-mono text-[12px] break-all text-[#121212]">{destination}</span></p>
          )}
        </SceneIn>
      )}
    </div>
  );
}

export const newsSkin: Skin = {
  accent: "#facc15",
  tabTitle: view => (view.scene ? `${view.scene.subject} – Dailybyte` : "Dailybyte – Today’s edition"),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#121212] font-serif text-[10px] font-bold text-white">D</span>,
  bookmarks: [
    { label: "Dailybyte", address: "dailybyte.example" },
    { label: "Rewards", address: "dailybyte.example/rewards" },
    { label: "Events", address: "dailybyte.example/events" },
  ],
  Surface: NewsSurface,
};
