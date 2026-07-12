"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pause, Trash2 } from "lucide-react";

type Dimension = "address_and_tone" | "answer_style" | "working_style" | "visual_taste";
type Memory = {
  id: string;
  insight: string;
  evidence: string;
  confidence: "new" | "steady" | "strong";
};
type ProfileMemoryResponse = {
  paused: boolean;
  consented: boolean;
  dimensions: Record<Dimension, Memory[]>;
  total: number;
};

const SECTION_COPY: Record<Dimension, { title: string; intro: string }> = {
  address_and_tone: { title: "Address and tone", intro: "How I try to speak with you." },
  answer_style: { title: "Answer style", intro: "How much detail and structure tends to help." },
  working_style: { title: "Working style", intro: "How you seem to move through decisions." },
  visual_taste: { title: "Visual taste", intro: "What I should remember when helping with design or images." },
};

const DIMENSIONS: Dimension[] = ["address_and_tone", "answer_style", "working_style", "visual_taste"];

export function ProfileMemoryPanel() {
  const [data, setData] = useState<ProfileMemoryResponse | null>(null);
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [ack, setAck] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    const response = await fetch("/api/profile/memories");
    if (response.ok) setData(await response.json());
  }

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/profile/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      setAck("Saved");
      window.setTimeout(() => setAck(""), 900);
      await load();
    }
  }

  const total = useMemo(() => data?.total ?? 0, [data?.total]);

  return (
    <section className="profile-memory-panel" aria-labelledby="profile-memory-title">
      <div className="profile-memory-panel-head">
        <div>
          <span className="object-label">YOUR PROFILE</span>
          <h2 id="profile-memory-title">What NeuralNexus has learned.</h2>
          <p>What NeuralNexus has learned about how you like to work and be spoken to. Yours to keep, edit, or clear. It never leaves without you.</p>
        </div>
        <div className="profile-owner-actions">
          <button type="button" className={data?.paused ? "is-paused" : ""} onClick={() => void patch({ action: "pause", paused: !data?.paused })}>
            <Pause size={15} />
            {data?.paused ? "Resume learning" : "Pause learning"}
          </button>
          <button type="button" onClick={() => setConfirmClear(true)}>
            <Trash2 size={15} />
            Clear everything
          </button>
        </div>
      </div>

      {data?.paused && <p className="profile-learning-paused">Learning paused. I am not noticing anything new.</p>}
      {data && !data.consented && (
        <div className="profile-consent-card">
          <div>
            <strong>NeuralNexus learns how you like to work.</strong>
            <p>Quietly, from how you use it. You can see everything it learns and turn it off anytime.</p>
          </div>
          <button type="button" onClick={() => void patch({ action: "consent", consented: true })}>Got it</button>
        </div>
      )}
      {ack && <p className="profile-memory-ack" role="status"><Check size={14} /> {ack}</p>}

      <div className="profile-memory-sections">
        {DIMENSIONS.map((dimension) => {
          const memories = data?.dimensions[dimension] ?? [];
          return (
            <article key={dimension} className="profile-memory-section">
              <div>
                <h3>{SECTION_COPY[dimension].title}</h3>
                <p>{SECTION_COPY[dimension].intro}</p>
              </div>
              {memories.length ? (
                <div className="profile-memory-list">
                  {memories.map((memory) => (
                    <div key={memory.id} className={`profile-memory-row is-${memory.confidence}`}>
                      <div>
                        {editingId === memory.id ? (
                          <input
                            className="profile-memory-edit"
                            value={editingValue}
                            onChange={(event) => setEditingValue(event.target.value)}
                            aria-label="Edit profile signal"
                          />
                        ) : (
                          <strong>{memory.insight}</strong>
                        )}
                        <div className="profile-memory-actions">
                          <button type="button" onClick={() => setOpenWhy(openWhy === memory.id ? null : memory.id)}>
                            Why this?
                          </button>
                          {editingId === memory.id ? (
                            <>
                              <button type="button" onClick={() => { setEditingId(null); setEditingValue(""); }}>Cancel</button>
                              <button type="button" onClick={() => { void patch({ action: "update", id: memory.id, insight: editingValue }); setEditingId(null); setEditingValue(""); }}>
                                Save
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => { setEditingId(memory.id); setEditingValue(memory.insight); }}>
                              Edit
                            </button>
                          )}
                          <button type="button" onClick={() => void patch({ action: "remove", id: memory.id })}>Forget</button>
                        </div>
                      </div>
                      {openWhy === memory.id && <p>Because this pattern appeared in your recent chats: {memory.evidence}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="profile-empty-memory">Nothing here yet — keep chatting and I&apos;ll notice.</p>
              )}
            </article>
          );
        })}
      </div>

      {total >= 4 && <p className="profile-export-milestone">I&apos;ve learned enough to speak your language now. Want to take it with you?</p>}

      {confirmClear && (
        <div className="profile-clear-confirm" role="dialog" aria-modal="true" aria-label="Clear profile">
          <div>
            <p>This erases everything NeuralNexus has learned about you. Your chats stay. Continue?</p>
            <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
            <button type="button" onClick={() => { setConfirmClear(false); void patch({ action: "clear" }); }}>Continue</button>
          </div>
        </div>
      )}
    </section>
  );
}
