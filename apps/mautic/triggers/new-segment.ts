import type { TriggerDefinition } from "@w6w/types";
import segmentList from "../actions/segment-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /segments` is a small collection read in full through `segment-list` (`returnAll`, `start`/`limit`
 * paging; https://devdocs.mautic.org/en/7.1/rest_api/segments.html, 2026-11-10); a check diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each segment that appears in Mautic.",
  output: [
    { key: "id", type: "number", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "alias", type: "string", label: "Alias" },
    { key: "isPublished", type: "boolean", label: "Published" },
    { key: "dateAdded", type: "string", label: "Created at" },
  ],
  sample: {
    "id": 4,
    "name": "VIP customers",
    "alias": "vip-customers",
    "isPublished": true,
    "dateAdded": "2026-11-09T09:30:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: segmentList, ctx }),
};

export default trigger;
