"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PencilLine, X } from "lucide-react";
import { MOTION } from "@/lib/motion";

export type StreamItem = {
  id: string;
  type: "skill_rule" | "taste_rule" | "autopilot" | "draft_output" | "disputed_claim";
  source: string;
  preview: string;
  provenance: string;
  endpoint: string;
  projectId?: string;
  outputId?: string;
  payload?: any;
};

type DecisionStreamProps = {
  items: StreamItem[];
  onRefresh: () => Promise<void> | void;
  onRevise: (item: StreamItem) => void;
};

export function DecisionStream({ items, onRefresh, onRevise }: DecisionStreamProps) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<"approve" | "reject" | "revise">("approve");
  const item = items[Math.min(index, Math.max(0, items.length - 1))];

  useEffect(() => {
    setIndex((value) => Math.min(value, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!item) return;
      if (event.key.toLowerCase() === "j") setIndex((value) => Math.min(items.length - 1, value + 1));
      if (event.key.toLowerCase() === "k") setIndex((value) => Math.max(0, value - 1));
      if (event.key.toLowerCase() === "a") void resolve("approve");
      if (event.key.toLowerCase() === "r") revise();
      if (event.key.toLowerCase() === "x") void resolve("reject");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, items.length]);

  const empty = useMemo(() => items.length === 0, [items.length]);

  async function resolve(action: "approve" | "reject") {
    if (!item) return;
    setError("");
    setDirection(action);
    try {
      const request = requestFor(item, action);
      const response = await fetch(request.url, request.init);
      if (!response.ok) throw new Error(`${action} failed (${response.status})`);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || "Could not resolve this item.");
    }
  }

  function revise() {
    if (!item) return;
    setError("");
    setDirection("revise");
    onRevise(item);
  }

  if (empty) return <div className="stream-empty">Nothing needs your judgment. Work creates the stream.</div>;

  return (
    <section className="decision-stream" aria-label="Decision stream" aria-describedby="stream-help">
      <p id="stream-help">J/K move. A approves. R revises. X rejects.</p>
      <AnimatePresence mode="wait">
        {item && (
          <motion.article
            key={item.id}
            className={`stream-card exits-${direction}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: direction === "approve" ? 22 : direction === "reject" ? -22 : 0 }}
            transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
            tabIndex={0}
          >
            <span className="object-label">{item.source}</span>
            <h3>{item.preview}</h3>
            <p>{item.provenance}</p>
            {error && <small className="crucible-error">{error}</small>}
            <div className="stream-actions">
              <button type="button" onClick={() => void resolve("approve")}><Check size={16} /> Approve</button>
              <button type="button" onClick={revise}><PencilLine size={16} /> Revise</button>
              <button type="button" onClick={() => void resolve("reject")}><X size={16} /> Reject</button>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </section>
  );
}

function requestFor(item: StreamItem, action: "approve" | "reject") {
  if (item.type === "skill_rule" || item.type === "taste_rule") {
    return {
      url: item.endpoint,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action === "approve" ? "accept" : "reject" }) },
    };
  }
  if (item.type === "autopilot") {
    if (action === "approve") {
      return {
        url: "/api/autopilot",
        init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.payload) },
      };
    }
    return {
      url: "/api/autopilot",
      init: { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: item.payload.projectId, stepName: item.payload.stepName }) },
    };
  }
  if (item.type === "draft_output") {
    if (action === "approve") {
      return {
        url: item.endpoint,
        init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalContent: item.payload?.content ?? "" }) },
      };
    }
    return { url: "/api/stream", init: { method: "GET" } };
  }
  return { url: "/api/stream", init: { method: "GET" } };
}
