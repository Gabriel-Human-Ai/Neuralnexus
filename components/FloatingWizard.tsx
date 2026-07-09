"use client";

import { useMemo, useState } from "react";
import { Search, Send, Sparkles, X } from "lucide-react";
import { routeWizardRequest, WIZARD_QUICK_ACTIONS, type WizardIntent } from "@/lib/wizardActions";

type FloatingWizardProps = {
  enabled?: boolean;
  status?: string;
  onIntent: (intent: WizardIntent) => void;
};

export function FloatingWizard({ enabled = true, status = "I can route you to the right place.", onIntent }: FloatingWizardProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(status);
  const quickActions = useMemo(() => WIZARD_QUICK_ACTIONS, []);

  if (!enabled) return null;

  const submit = () => {
    const route = routeWizardRequest(input);
    setReply(route.message);
    onIntent(route.intent);
    setInput("");
  };

  return (
    <div className="floating-wizard">
      {open && (
        <div className="floating-wizard-panel" role="dialog" aria-label="NeuralNexus Wizard">
          <div className="floating-wizard-head">
            <span><Sparkles size={15} /> Wizard</span>
            <button onClick={() => setOpen(false)} aria-label="Close wizard"><X size={15} /></button>
          </div>
          <p>{reply}</p>
          <div className="floating-wizard-actions">
            {quickActions.map((action) => (
              <button key={action.intent} onClick={() => { setReply(action.message); onIntent(action.intent); }}>
                {action.label}
              </button>
            ))}
            <button onClick={() => onIntent("find_something")}><Search size={14} /> Find something</button>
          </div>
          <div className="floating-wizard-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask for a real action"
            />
            <button onClick={submit} disabled={!input.trim()} aria-label="Ask wizard"><Send size={14} /></button>
          </div>
        </div>
      )}
      <button className="floating-wizard-orb" onClick={() => setOpen((value) => !value)} aria-label="Open NeuralNexus Wizard">
        <span />
      </button>
    </div>
  );
}
