import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import transcriptSearch from "../actions/transcript-search.ts";

interface Transcript {
  id?: unknown;
}

/** Transcripts appear after the meeting ends; a two-day window on the meeting date covers that lag. */
const LOOKBACK_MS = 2 * 86_400_000;

/**
 * `transcripts(fromDate: …)` filters by MEETING date (a since-filter, not a creation cursor), so
 * each check asks for meetings from the last two days and dedupes by transcript `id`. A transcript
 * for a meeting older than the window is not seen.
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
    const fromDate = new Date(Date.now() - LOOKBACK_MS).toISOString();
    return await pollNewItems<Transcript>({
      state,
      maxPages: 1,
      maxEvents: 50,
      seenWindow: 400,
      idOf: (transcript) => String(transcript.id ?? ""),
      async fetchPage() {
        const out = await transcriptSearch.execute!({ fromDate, limit: 50 }, ctx) as {
          transcripts?: Transcript[];
        };
        return { items: Array.isArray(out?.transcripts) ? out.transcripts : [] };
      },
    });
  },
};

export default trigger;
