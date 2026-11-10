import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import transcriptSearch from "../actions/transcript-search.ts";

interface Transcript {
  id?: unknown;
  dateString?: unknown;
}

const PAGE_SIZE = 50;
/** Pages read per check; a larger window resumes at the saved `skip` offset on the next check. */
const MAX_PAGES = 4;

/** Transcripts appear after the meeting ends; a two-day window on the meeting date covers that lag. */
const LOOKBACK_MS = 2 * 86_400_000;

/**
 * `transcripts(fromDate: …)` filters by MEETING date (a since-filter, not a creation cursor), so
 * each check asks for meetings from the last two days and dedupes by transcript `id`. A transcript
 * for a meeting older than the window is not seen. A window longer than four pages resumes at the
 * saved `skip` offset on the next check; the cursor advances only once it drains.
 */
const trigger: TriggerDefinition = {
  key: "new-transcript",
  title: "New Transcript",
  description:
    "The run gets each meeting transcript newly available in Fireflies (meetings from the last two days).",
  output: [
    { key: "id", type: "string", label: "Transcript ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "dateString", type: "string", label: "Meeting date (ISO 8601)" },
    { key: "duration", type: "number", label: "Duration (minutes)" },
    { key: "organizer_email", type: "string", label: "Organizer email" },
    { key: "transcript_url", type: "string", label: "Transcript URL" },
  ],
  sample: {
    id: "01HZY8YVN2Y2P5Q7Z6P7R2Z3T4",
    title: "Weekly sync",
    dateString: "2026-11-09T15:00:00.000Z",
    duration: 32,
    organizer_email: "ada@example.com",
    transcript_url: "https://example.com/view/01HZY8YVN2Y2P5Q7Z6P7R2Z3T4",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollWindow<Transcript, number>({
      state,
      now: Date.now(),
      overlapMs: LOOKBACK_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (transcript) => String(transcript.id ?? ""),
      // `fromDate` compares the meeting date.
      tsOf: (transcript) => {
        const ms = typeof transcript.dateString === "string"
          ? Date.parse(transcript.dateString)
          : NaN;
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, skip) {
        const out = await transcriptSearch.execute!({
          fromDate: new Date(since).toISOString(),
          limit: PAGE_SIZE,
          ...(skip ? { skip } : {}),
        }, ctx) as { transcripts?: Transcript[] };
        const items = Array.isArray(out?.transcripts) ? out.transcripts : [];
        return { items, next: items.length >= PAGE_SIZE ? (skip ?? 0) + PAGE_SIZE : undefined };
      },
    });
  },
};

export default trigger;
