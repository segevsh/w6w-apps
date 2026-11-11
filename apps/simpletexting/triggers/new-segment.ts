import type { TriggerDefinition } from "@w6w/types";
import segmentList from "../actions/segment-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * `GET /api/contact-segments` is a page-numbered list (0-based `page`, `size` up to 500) with no sort or date
 * filter — an account's segment records are a small bounded collection
 * (https://api-doc.simpletexting.com/, Get all Segments, verified 2026-11-10). Every check reads the whole
 * list through `segment-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each contact segment newly created in the account.",
  output: [
    { key: "segmentId", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: {
    segmentId: "507f191e810c19729de860ea",
    name: "Active buyers",
    created: "2026-11-10T09:00:00Z",
    updated: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({
      state,
      items: await readAllPages(segmentList, ctx),
      idOf: (item) => (item as { segmentId?: unknown }).segmentId,
    });
  },
};

export default trigger;
