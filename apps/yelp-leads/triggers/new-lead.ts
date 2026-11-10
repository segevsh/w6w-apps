import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import getLeadIdsForBusiness from "../actions/get-lead-ids-for-business.ts";

/**
 * `GET /v3/businesses/{business_id}/lead_ids?created_after=<ISO>&limit=20[&after_lead_id=<id>]` —
 * Yelp documents `created_after` ("only leads created at or after this timestamp (inclusive)") and
 * that "time filters are applied first, then results are paginated with after_lead_id within the
 * filtered window" (https://docs.developer.yelp.com/reference/get-lead-ids-for-business). No sort
 * order is documented, so the trigger pages the window with `after_lead_id` (resuming on the next
 * check when a window holds more than one page) and dedupes by lead id.
 */

/** Re-read this much before the saved cursor, so clock skew and in-flight leads are not lost. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 20;

export const clock = { now: (): number => Date.now() };

interface Resume {
  since: string;
  after: string;
  startedAt: string;
}
interface State {
  cursor?: string;
  /** Leads created before this (ms) predate the seed; the vendor-side filter never returns them. */
  floor?: number;
  resume?: Resume;
}

/** Yelp's documented ISO 8601 example has whole seconds and a `Z`. */
const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 19) + "Z";

const trigger: TriggerDefinition = {
  key: "new-lead",
  title: "New Lead",
  description: "The run gets the ID of each lead a Yelp business newly receives.",
  params: [{
    key: "businessId",
    label: "Business ID",
    type: "string",
    required: true,
    hint: "The Yelp business whose leads to watch.",
  }],
  output: [{ key: "lead_id", type: "string", label: "Lead ID" }],
  sample: { lead_id: "sample-lead-id" },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const s = (state ?? {}) as State;
    const nowMs = clock.now();
    const seeded = typeof s.cursor === "string" && Number.isFinite(Date.parse(s.cursor));
    const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
    const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
    const windowStart = resume
      ? Date.parse(resume.since)
      : (seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS;
    // The vendor filters by creation time, so clamping the window start to the seed time
    // keeps every pre-seed lead out however many pages it holds.
    const since = stamp(floor === undefined ? windowStart : Math.max(windowStart, floor));
    const startedAt = resume?.startedAt ?? new Date(nowMs).toISOString();
    let more: string | undefined;
    const result = await pollNewItems<{ lead_id: string }>({
      state: seeded ? state : undefined,
      maxPages: 1,
      maxEvents: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (item) => item.lead_id,
      async fetchPage() {
        const out = await getLeadIdsForBusiness.execute({
          businessId: String(params.businessId ?? ""),
          limit: PAGE_SIZE,
          createdAfter: since,
          ...(resume ? { afterLeadId: resume.after } : {}),
        }, ctx) as { lead_ids?: unknown[]; has_more?: boolean };
        const ids = (out.lead_ids ?? []).map(String);
        more = out.has_more && ids.length > 0 ? ids[ids.length - 1] : undefined;
        return { items: ids.map((lead_id) => ({ lead_id })) };
      },
    });
    if (!seeded) {
      return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
    }
    // The cursor moves only once the whole window is drained; until then resume after the last id.
    return {
      events: result.events,
      nextState: more !== undefined
        ? {
          ...result.nextState,
          cursor: s.cursor,
          floor,
          resume: { since: new Date(windowStart).toISOString(), after: more, startedAt },
        }
        : { ...result.nextState, cursor: startedAt, floor },
    };
  },
};

export default trigger;
