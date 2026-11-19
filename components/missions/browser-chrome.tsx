"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import {
  AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, Icon, LockCloseIcon,
  MultipleCrossCancelIcon, PlusIcon, RefreshIcon, StarIcon, ThreeDotsMenuVerticalIcon,
} from "./icon";

export type ChromeTab = { id: string; title: string; icon?: ReactNode; alert?: boolean };

/** Splits a host so the part that decides ownership can be emphasized, like real browsers do. */
export function splitHost(address: string) {
  const [host, ...rest] = address.split("/");
  const path = rest.length ? `/${rest.join("/")}` : "";
  const labels = host.split(".");
  const registrable = labels.slice(-2).join(".");
  const prefix = labels.length > 2 ? `${labels.slice(0, -2).join(".")}.` : "";
  return { prefix, registrable, path };
}

export function Address({ address, className }: { address: string; className?: string }) {
  const { prefix, registrable, path } = splitHost(address);
  return (
    <span className={cn("truncate", className)}>
      <span className="text-[#5f6368]">{prefix}</span>
      <span className="text-[#202124]">{registrable}</span>
      <span className="text-[#5f6368]">{path}</span>
    </span>
  );
}

const iconButton = "flex size-8 shrink-0 items-center justify-center rounded-full text-[#474747] transition-colors hover:bg-black/[0.06]";

/**
 * A believable desktop browser: tab strip, toolbar, omnibox with the
 * registrable domain emphasized, optional bookmarks bar, and a status bar
 * that shows a hovered link’s real destination.
 */
export function BrowserChrome({
  tabs, activeTab, onTab, address, secure = true, bookmarks, onBookmark, status, onSiteInfo, overlay, children, className,
}: {
  tabs: ChromeTab[];
  activeTab: string;
  onTab?: (id: string) => void;
  address: string;
  secure?: boolean;
  bookmarks?: { label: string; address: string }[];
  onBookmark?: (address: string) => void;
  status?: string | null;
  /** Called when the padlock is pressed. */
  onSiteInfo?: () => void;
  /** Rendered just below the toolbar (site info, permission prompts). */
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] bg-[#dfe3e7] font-sans text-[#1f1f1f] ring-1 ring-black/40", className)}>
      <div className="flex h-10 items-end gap-0.5 pr-2 pl-3" role="tablist" aria-label="Browser tabs">
        <span aria-hidden className="mr-3 mb-3.5 hidden gap-2 sm:flex">
          <i className="size-3 rounded-full bg-[#ff5f57]" />
          <i className="size-3 rounded-full bg-[#febc2e]" />
          <i className="size-3 rounded-full bg-[#28c840]" />
        </span>
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab?.(tab.id)}
              className={cn(
                "group relative flex h-[34px] max-w-60 min-w-0 flex-1 items-center gap-2 rounded-t-[10px] pr-2 pl-3 text-left text-[12px] sm:flex-none sm:basis-60",
                active ? "bg-white" : "text-[#3c4043] hover:bg-white/45",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">{tab.icon}</span>
              <span className="truncate">{tab.title}</span>
              {tab.alert && <span className="size-1.5 shrink-0 rounded-full bg-[#1a73e8]" aria-label="New activity" />}
              <span aria-hidden className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full text-[#5f6368] opacity-0 group-hover:opacity-100">
                <Icon icon={MultipleCrossCancelIcon} size={12} />
              </span>
            </button>
          );
        })}
        <span aria-hidden className="mb-1.5 ml-1 flex size-7 items-center justify-center text-[#474747]"><Icon icon={PlusIcon} size={16} /></span>
      </div>

      <div className="flex h-11 items-center gap-1 bg-white px-2">
        <span aria-hidden className={iconButton}><Icon icon={ArrowLeftIcon} size={17} /></span>
        <span aria-hidden className={cn(iconButton, "text-[#b8b8b8]")}><Icon icon={ArrowRightIcon} size={17} /></span>
        <span aria-hidden className={iconButton}><Icon icon={RefreshIcon} size={16} /></span>
        <div className="mx-1 flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-full bg-[#edf0f4] pr-2 pl-1 text-[14px]">
          <button
            type="button"
            onClick={onSiteInfo}
            disabled={!onSiteInfo}
            aria-label={secure ? "View site information" : "Not secure. View site information"}
            className={cn("flex h-7 shrink-0 items-center gap-1 rounded-full px-2", onSiteInfo && "hover:bg-black/[0.07]", secure ? "text-[#474747]" : "text-[#c5221f]")}
          >
            <Icon icon={secure ? LockCloseIcon : AlertTriangleIcon} size={14} />
            {!secure && <span className="text-[12px]">Not secure</span>}
          </button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={address} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="min-w-0 flex-1 truncate">
              <Address address={address} />
            </motion.span>
          </AnimatePresence>
          <span aria-hidden className="text-[#5f6368]"><Icon icon={StarIcon} size={15} /></span>
        </div>
        <span aria-hidden className={cn(iconButton, "hidden sm:flex")}><Icon icon={ThreeDotsMenuVerticalIcon} size={16} /></span>
      </div>

      {bookmarks && (
        <div className="flex h-8 items-center gap-0.5 overflow-x-auto border-b border-[#e3e3e3] bg-white px-2 text-[12px]">
          {bookmarks.map(bookmark => (
            <button
              key={bookmark.address}
              type="button"
              onClick={() => onBookmark?.(bookmark.address)}
              title={bookmark.address}
              className="flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[#3c4043] hover:bg-[#edf0f4]"
            >
              <Icon icon={BookmarkIcon} size={12} className="text-[#5f6368]" />{bookmark.label}
            </button>
          ))}
        </div>
      )}
      {!bookmarks && <div className="h-px bg-[#e3e3e3]" />}

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        {children}
        {overlay}
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute bottom-0 left-0 z-30 max-w-[70%] truncate rounded-tr-md border-t border-r border-[#dadce0] bg-[#f8f9fa] px-2 py-0.5 text-[12px] text-[#3c4043]"
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
