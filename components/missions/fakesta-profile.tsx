"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeftIcon, BookmarkIcon, ChatIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, Icon, MultipleCrossCancelIcon, SendPlaneHorizontalIcon } from "./icon";

export type FakestaHandle = "riley.afterhours" | "jordan.walks" | "sam.jpg";

type Post = { src: string; caption: string; likes: number; when: string };
type Profile = {
  handle: FakestaHandle;
  name: string;
  avatar: string;
  bio: string[];
  stats: [posts: number, followers: string, following: number];
  mutual?: string;
  highlights: { label: string; src: string }[];
  posts: Post[];
};

const photo = (name: string) => `/missions/photos/fakesta/${name}.jpg`;

/** Fictional people. Photos: Unsplash License (see public/missions/photos/credits.json). */
export const PROFILES: Record<FakestaHandle, Profile> = {
  "riley.afterhours": {
    handle: "riley.afterhours",
    name: "Riley ✦",
    avatar: "/missions/photos/avatar-riley.jpg",
    bio: ["golden hour enthusiast 🌅", "chilli oil > everything", "rooftops, late dinners, good company"],
    stats: [9, "1,284", 342],
    mutual: "Followed by jordan.walks and 12 others",
    highlights: [
      { label: "sunsets", src: photo("riley-4") },
      { label: "eats", src: photo("riley-8") },
      { label: "us?", src: photo("riley-3") },
    ],
    posts: [
      { src: photo("riley-1"), caption: "the light tonight was unreal", likes: 312, when: "2d" },
      { src: photo("riley-2"), caption: "soft focus kind of mood", likes: 287, when: "4d" },
      { src: photo("riley-3"), caption: "saving this bench for someone 🙈", likes: 401, when: "1w" },
      { src: photo("riley-4"), caption: "pink skies only", likes: 256, when: "1w" },
      { src: photo("riley-5"), caption: "new hair, who dis", likes: 512, when: "2w" },
      { src: photo("riley-6"), caption: "chasing sunlight", likes: 198, when: "3w" },
      { src: photo("riley-7"), caption: "end of a perfect day", likes: 233, when: "4w" },
      { src: photo("riley-8"), caption: "summer in one photo 🍓", likes: 176, when: "5w" },
      { src: photo("riley-9"), caption: "sit with me?", likes: 344, when: "6w" },
    ],
  },
  "jordan.walks": {
    handle: "jordan.walks",
    name: "Jordan",
    avatar: "/missions/photos/avatar-jordan.jpg",
    bio: ["walks, water, wandering", "riley's plus-one when available"],
    stats: [6, "812", 290],
    mutual: "Followed by riley.afterhours",
    highlights: [{ label: "trips", src: photo("jordan-3") }, { label: "sea", src: photo("jordan-1") }],
    posts: [
      { src: photo("jordan-1"), caption: "skyline from the water", likes: 120, when: "3d" },
      { src: photo("jordan-2"), caption: "paddle season", likes: 98, when: "1w" },
      { src: photo("jordan-3"), caption: "made it to the top", likes: 143, when: "2w" },
      { src: photo("jordan-4"), caption: "night sky did not disappoint", likes: 167, when: "3w" },
      { src: photo("jordan-5"), caption: "one more ridge", likes: 88, when: "1mo" },
      { src: photo("jordan-6"), caption: "low tide thoughts", likes: 74, when: "1mo" },
    ],
  },
  "sam.jpg": {
    handle: "sam.jpg",
    name: "Sam",
    avatar: photo("sam-1"),
    bio: ["this is you 👋", "film camera, loud playlists"],
    stats: [6, "407", 388],
    highlights: [{ label: "gigs", src: photo("sam-5") }],
    posts: [
      { src: photo("sam-1"), caption: "new lens day", likes: 64, when: "1d" },
      { src: photo("sam-2"), caption: "busking at the market", likes: 51, when: "5d" },
      { src: photo("sam-3"), caption: "crowds and colour", likes: 47, when: "1w" },
      { src: photo("sam-4"), caption: "hat weather", likes: 39, when: "2w" },
      { src: photo("sam-5"), caption: "front row 🔊", likes: 88, when: "3w" },
      { src: photo("sam-6"), caption: "slow morning", likes: 30, when: "1mo" },
    ],
  },
};

const GRADIENT = "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)";

export function FakestaProfile({ handle, onBack, onMessage }: { handle: FakestaHandle; onBack: () => void; onMessage?: () => void }) {
  const profile = PROFILES[handle];
  const [open, setOpen] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [following, setFollowing] = useState(handle !== "sam.jpg");
  const self = handle === "sam.jpg";
  const post = open === null ? null : profile.posts[open];

  const toggleLike = (index: number) => setLiked(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });

  return (
    <div className="relative h-full overflow-y-auto bg-white text-black">
      <div className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-[#efefef] bg-white/95 px-4 backdrop-blur">
        <button type="button" onClick={onBack} aria-label="Back to messages" className="flex size-9 items-center justify-center rounded-full hover:bg-[#efefef]">
          <Icon icon={ArrowLeftIcon} size={20} />
        </button>
        <b className="text-[15px]">{profile.handle}</b>
      </div>

      <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-8">
        <header className="flex items-center gap-6 sm:gap-14">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full p-[3px] sm:size-36" style={{ background: GRADIENT }}>
            <span className="relative size-full overflow-hidden rounded-full ring-[3px] ring-white">
              <Image src={profile.avatar} alt={`${profile.name}’s profile photo`} fill sizes="144px" className="object-cover" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-[20px]">{profile.handle}</h2>
              {self ? (
                <span className="rounded-lg bg-[#efefef] px-4 py-1.5 text-[14px] font-semibold">Edit profile</span>
              ) : (
                <>
                  <button type="button" onClick={() => setFollowing(value => !value)} className={cn("rounded-lg px-4 py-1.5 text-[14px] font-semibold", following ? "bg-[#efefef]" : "bg-[#0095f6] text-white")}>
                    {following ? "Following" : "Follow"}
                  </button>
                  {onMessage && <button type="button" onClick={onMessage} className="rounded-lg bg-[#efefef] px-4 py-1.5 text-[14px] font-semibold">Message</button>}
                </>
              )}
            </div>
            <ul className="mt-4 hidden gap-8 text-[15px] sm:flex">
              <li><b>{profile.stats[0]}</b> posts</li>
              <li><b>{profile.stats[1]}</b> followers</li>
              <li><b>{profile.stats[2]}</b> following</li>
            </ul>
            <div className="mt-4 hidden text-[14px] leading-snug sm:block">
              <p className="font-semibold">{profile.name}</p>
              {profile.bio.map(line => <p key={line}>{line}</p>)}
              {profile.mutual && <p className="mt-1 text-[12px] text-[#737373]">{profile.mutual}</p>}
            </div>
          </div>
        </header>
        <div className="mt-4 text-[14px] leading-snug sm:hidden">
          <p className="font-semibold">{profile.name}</p>
          {profile.bio.map(line => <p key={line}>{line}</p>)}
          <p className="mt-2 text-[13px]"><b>{profile.stats[0]}</b> posts · <b>{profile.stats[1]}</b> followers · <b>{profile.stats[2]}</b> following</p>
        </div>

        <ul className="mt-8 flex gap-6 overflow-x-auto pb-2">
          {profile.highlights.map(highlight => (
            <li key={highlight.label} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="relative size-16 overflow-hidden rounded-full ring-1 ring-[#dbdbdb] ring-offset-2">
                <Image src={highlight.src} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="text-[12px] font-semibold">{highlight.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-[#dbdbdb] pt-1">
          <p className="mb-1 flex justify-center gap-2 py-3 text-[12px] font-semibold tracking-widest uppercase">Posts</p>
          <ul className="grid grid-cols-3 gap-1">
            {profile.posts.map((item, index) => (
              <li key={item.src}>
                <button type="button" onClick={() => setOpen(index)} className="group relative block aspect-square w-full overflow-hidden bg-[#efefef]" aria-label={`Open post: ${item.caption}`}>
                  <Image src={item.src} alt="" fill sizes="(min-width: 760px) 250px, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/35 text-[15px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon icon={HeartIcon} size={18} strokeWidth={2.5} />{item.likes + (liked.has(index) ? 1 : 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {post && open !== null && (
          <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <button type="button" aria-label="Close post" className="absolute top-3 right-3 text-white" onClick={() => setOpen(null)}><Icon icon={MultipleCrossCancelIcon} size={24} /></button>
            {open > 0 && <button type="button" aria-label="Previous post" onClick={event => { event.stopPropagation(); setOpen(open - 1); }} className="absolute left-3 flex size-9 items-center justify-center rounded-full bg-white/90"><Icon icon={ChevronLeftIcon} size={18} /></button>}
            {open < profile.posts.length - 1 && <button type="button" aria-label="Next post" onClick={event => { event.stopPropagation(); setOpen(open + 1); }} className="absolute right-3 flex size-9 items-center justify-center rounded-full bg-white/90"><Icon icon={ChevronRightIcon} size={18} /></button>}
            <motion.article
              key={open}
              onClick={event => event.stopPropagation()}
              className="flex max-h-full w-full max-w-[860px] flex-col overflow-hidden rounded-md bg-white md:flex-row"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="relative aspect-square w-full bg-black md:w-[60%]">
                <Image src={post.src} alt={post.caption} fill sizes="520px" className="object-cover" onDoubleClick={() => toggleLike(open)} />
              </div>
              <div className="flex flex-1 flex-col text-[14px]">
                <div className="flex items-center gap-3 border-b border-[#efefef] p-3">
                  <span className="relative size-8 overflow-hidden rounded-full"><Image src={profile.avatar} alt="" fill sizes="32px" className="object-cover" /></span>
                  <b>{profile.handle}</b>
                </div>
                <p className="flex-1 p-3"><b>{profile.handle}</b> {post.caption}</p>
                <div className="border-t border-[#efefef] p-3">
                  <div className="flex gap-4">
                    <button type="button" onClick={() => toggleLike(open)} aria-label={liked.has(open) ? "Unlike" : "Like"} aria-pressed={liked.has(open)}>
                      <Icon icon={HeartIcon} size={24} className={cn(liked.has(open) && "fill-[#ff3040] text-[#ff3040]")} />
                    </button>
                    <Icon icon={ChatIcon} size={24} />
                    <Icon icon={SendPlaneHorizontalIcon} size={24} />
                    <Icon icon={BookmarkIcon} size={24} className="ml-auto" />
                  </div>
                  <p className="mt-2 font-semibold">{(post.likes + (liked.has(open) ? 1 : 0)).toLocaleString()} likes</p>
                  <p className="mt-1 text-[11px] text-[#737373] uppercase">{post.when} ago</p>
                </div>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
