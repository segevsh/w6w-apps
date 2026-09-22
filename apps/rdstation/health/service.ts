import type { HealthCheckDefinition, HealthFeedEntry, HealthState } from "@w6w/types";

/**
 * Is RD Station up? — read off the vendor's own status feed, and read loosely.
 *
 * ## The feed
 *
 * `https://status.rdstation.com/history.rss` is a real, live RSS document
 * (verified 2026-09-22: `200`, `content-type: application/rss+xml`, channel
 * title `Status RD Station`, `<generator>incident.io</generator>`, nine incident
 * entries going back to June 2026). It is declared as a `feed` rather than
 * hand-parsed, per `core/docs/build-a-w6w-app.md` ("Declare a status feed; don't
 * parse one"), so the host fetches and normalises it and this hook only reads
 * `input.feed.latest` — one entry per incident, newest first. The feed's host is
 * allowlisted implicitly for this hook only, which is why it is deliberately
 * **not** in the app's `w6w.network.allow`: no Action has any business calling
 * a status page.
 *
 * ## How an entry's state is read
 *
 * incident.io writes the incident's current state into the entry body as
 * `<b>Status: …</b>`, and the observed vocabulary is localised Portuguese —
 * `Resolvido` (resolved) and `Concluído` (completed/maintenance finished) on every
 * one of the nine live entries. Worse, the *title* of a resolved incident still
 * reads like an outage ("Indisponibilidade RD Station CRM", "Erros 500"), which
 * is exactly the trap the pack's `build-a-w6w-app.md` note warns about — so the
 * state is read from the body's status marker, never from the title.
 *
 * The vocabulary is treated as three-valued rather than two:
 *
 *   - a **closing** word (`Resolvido`, `Concluído`, `Cancelado`, `Resolved`,
 *     `Completed`, `Cancelled`) means the incident is over;
 *   - an **opening** word (`Investigando`, `Identificado`, `Monitorando`,
 *     `Em andamento`, `Investigating`, `Identified`, `Monitoring`, `In progress`)
 *     means it is still live, and is what turns this check `degraded`;
 *   - anything else — including a status word incident.io has not used before —
 *     is **unknown**, not open. Guessing "open" from an unfamiliar word would
 *     report yesterday's resolved maintenance as an outage today; guessing
 *     "closed" would hide a real one. The hook says which it could not read.
 *
 * ## Severity, and why it is `informational`
 *
 * The page is RD Station's whole product suite, not this app's surface: its
 * live `summary.json` component list is dominated by RD Station Marketing
 * (`Automação`, `Email Marketing`, `Landing Page`, `Segmentação de Leads`, …),
 * `Academy`, `Conversas de Whatsapp`, billing and `RD Station CRM para vender
 * por Whatsapp` — there is no component for the CRM v1 API this app calls. A red
 * flag there is therefore weak evidence about this app, so it must never fatally
 * downgrade the app's own verdict.
 *
 * The credential-liveness half of the health surface needs nothing here:
 * `Auth.test` is projected automatically as the derived `auth:api-key` check.
 */
export const STATUS_FEED_URL = "https://status.rdstation.com/history.rss";

/** incident.io's marker at the head of an entry body, e.g. `<b>Status: Resolvido</b>`. */
const STATUS_MARKER = /Status:\s*([^\s<.]+)(?:\s+([^\s<.]+))?/i;

const CLOSING = new Set([
  "resolvido",
  "concluido",
  "concluído",
  "cancelado",
  "resolved",
  "completed",
  "cancelled",
  "canceled",
]);

const OPENING = new Set([
  "investigando",
  "identificado",
  "monitorando",
  "em andamento",
  "aberto",
  "investigating",
  "identified",
  "monitoring",
  "in progress",
  "open",
]);

/** What one feed entry says about itself. */
export type EntryState = "closed" | "open" | "unrecognised";

/**
 * Read one entry's state from the `Status:` marker in its body.
 *
 * `summary` is the normalised plain-text body and `summaryHtml` keeps the markup
 * the marker lives inside, so both are searched — an entry that ends up with
 * only one of them populated is still classified.
 */
export function classifyEntry(entry: HealthFeedEntry): EntryState {
  const text = `${entry.summary ?? ""} ${entry.summaryHtml ?? ""}`;
  const match = STATUS_MARKER.exec(text);
  if (!match) return "unrecognised";

  const oneWord = match[1].toLowerCase();
  const twoWords = match[2] ? `${oneWord} ${match[2].toLowerCase()}` : oneWord;

  if (CLOSING.has(oneWord) || CLOSING.has(twoWords)) return "closed";
  if (OPENING.has(oneWord) || OPENING.has(twoWords)) return "open";
  return "unrecognised";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "RD Station platform status",
  description:
    "Reads status.rdstation.com's incident.io RSS feed for open incidents. Informational: the page " +
    "covers RD Station's whole product suite, not the CRM v1 API this app calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  feed: { url: STATUS_FEED_URL },
  minIntervalSeconds: 300,

  check({ feed }): { state: HealthState; message?: string; ttlSeconds?: number } {
    // A feed that itself failed to fetch or parse says nothing about the vendor,
    // so `unknown`, never `down`.
    if (feed?.error) return { state: "unknown", message: feed.error };

    const latest = feed?.latest ?? [];
    const open: string[] = [];
    let unrecognised = 0;
    for (const entry of latest) {
      const state = classifyEntry(entry);
      if (state === "open") open.push(entry.title);
      else if (state === "unrecognised") unrecognised += 1;
    }

    if (open.length > 0) {
      return {
        state: "degraded",
        message: `${open.length} open incident(s), per status.rdstation.com: ${
          open.slice(0, 5).join("; ")
        }`,
        ttlSeconds: 300,
      };
    }

    if (unrecognised > 0) {
      return {
        state: "unknown",
        message:
          `${unrecognised} of ${latest.length} feed entries carry a status this check does not ` +
          "recognise — read status.rdstation.com directly",
        ttlSeconds: 300,
      };
    }

    return { state: "ok", ttlSeconds: 300 };
  },
};

export default service;
