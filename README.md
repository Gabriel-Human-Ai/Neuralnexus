# Jarvis Bridge (v1)

Dein persönliches AI Command Center: Chat mit OpenAI, Claude und GLM (OpenRouter) in einer Oberfläche – mit gemeinsamem Projekt-Gedächtnis, Kosten-Tracker und Export von CLAUDE.md / AGENTS.md.

## Installation (einmalig, ~5 Min)
1. Node.js installieren: https://nodejs.org (LTS-Version, einfach durchklicken)
2. Diesen Ordner entpacken, z.B. nach Dokumente/jarvis-bridge
3. Terminal in diesem Ordner öffnen und ausführen:
   npm install
   copy .env.example .env        (Mac/Linux: cp .env.example .env)
4. Datei ".env" mit einem Texteditor öffnen und mindestens EINEN API-Key eintragen.
5. Datenbank anlegen: npm run setup
6. Starten: npm run dev
7. Browser: http://localhost:3000

## API-Keys bekommen
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com
- OpenRouter (für GLM): https://openrouter.ai/keys

## Vom Handy nutzen
Handy und PC im selben WLAN:
1. PC-IP finden (Windows: ipconfig → "IPv4-Adresse", Mac: Systemeinstellungen → Netzwerk)
2. Auf dem Handy im Browser öffnen: http://DEINE-IP:3000
3. Optional: "Zum Home-Bildschirm hinzufügen" → App-Icon wie eine echte App.

Von unterwegs (nicht nur WLAN): kostenlosen Tunnel nutzen, z.B.
   npx cloudflared tunnel --url http://localhost:3000
→ gibt dir eine https-Adresse fürs Handy. PC muss dafür laufen.

## Erste Schritte
1. Links Projekt anlegen
2. Oben Modell wählen
3. Chatten – dein Gedächtnis wird automatisch kompakt mitgeschickt
4. Tab "Gedächtnis": Entscheidungen, Bugs, Regeln speichern
5. Button "CLAUDE.md / AGENTS.md ↓": Dateien für Claude Code / Codex generieren
6. "An anderes Modell übergeben": Handoff speichern, Modell wechseln, weitermachen
