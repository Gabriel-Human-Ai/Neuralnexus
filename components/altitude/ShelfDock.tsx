"use client";

import type { LucideIcon } from "lucide-react";
import { Boxes, Database, MessageCircle, Settings, Sparkles, Layers3, Inbox } from "lucide-react";
import { RollingNumber } from "@/components/ui/RollingNumber";

export type ShelfId = "skills" | "templates" | "knowledge" | "vault" | "chat" | "stream" | "settings";

type ShelfDockProps = {
  activeShelf: ShelfId | null;
  streamCount: number;
  onOpen: (shelf: ShelfId) => void;
  onCreate: () => void;
};

const SHELVES: { id: ShelfId; label: string; icon: LucideIcon }[] = [
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "templates", label: "Templates", icon: Boxes },
  { id: "knowledge", label: "Knowledge", icon: Database },
  { id: "vault", label: "Vault", icon: Layers3 },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "stream", label: "Stream", icon: Inbox },
  { id: "settings", label: "Settings", icon: Settings },
];

export function ShelfDock({ activeShelf, streamCount, onOpen, onCreate }: ShelfDockProps) {
  return (
    <>
      <nav className="shelf-dock" aria-label="Shelves">
        {SHELVES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={activeShelf === item.id ? "is-active" : ""}
              aria-label={item.label}
              title={item.label}
              onClick={() => onOpen(item.id)}
            >
              <Icon size={18} />
              {item.id === "stream" && streamCount > 0 && <span className="shelf-badge"><RollingNumber value={streamCount} /></span>}
              <em>
                <strong>{item.label}</strong>
                <small>Open shelf</small>
              </em>
            </button>
          );
        })}
      </nav>
      <nav className="altitude-mobile-bar" aria-label="Mobile altitude actions">
        <button type="button" onClick={() => onOpen("stream")}>
          <Inbox size={18} />
          <span>Stream</span>
          {streamCount > 0 && <strong><RollingNumber value={streamCount} /></strong>}
        </button>
        <button type="button" className="mobile-create-action" onClick={onCreate}>＋ Create</button>
        <button type="button" onClick={() => onOpen("templates")}>
          <Boxes size={18} />
          <span>Shelves</span>
        </button>
      </nav>
    </>
  );
}
