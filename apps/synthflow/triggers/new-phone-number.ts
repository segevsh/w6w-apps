import type { Param } from "@w6w/types";
import phoneNumberList from "../actions/phone-number-list.ts";
import { readOffsetPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c): `GET /numbers` takes `workspace`, `limit`/`offset` and `is_available` and documents no sort
 * (https://docs.synthflow.ai/openapi.json, verified 2026-11-10), so the list is read whole (up to 10 pages
 * of 100; a larger list is refused with an error, not truncated) and only added rows are events.
 */
export default snapshotTrigger<{ workspace: string }>({
  key: "new-phone-number",
  title: "New Phone Number",
  description: "The run gets each phone number newly added to the selected workspace.",
  params: (phoneNumberList.params ?? []).filter((p) => p.key === "workspace") as Param[],
  output: [
    { key: "sid", type: "string", label: "Number ID" },
    { key: "number", type: "string", label: "Phone number" },
    { key: "is_available", type: "boolean", label: "Free for an inbound agent" },
  ],
  sample: { sid: "number-1", number: "+14155552671", is_available: true },
  rows: (p, ctx) =>
    readOffsetPages("new-phone-number", phoneNumberList, { workspace: p.workspace }, ctx),
  idOf: (r) => String(r.sid ?? r.number ?? ""),
});
