import { snapshotTrigger } from "../lib/triggers.ts";
import positionList from "../actions/position-list.ts";

// Same unpaged read as `new-position` (https://developer.breezy.hr/reference/listpositions,
// verified 2026-11-10); every position carries `updated_date`, so an edit changes its stamp and
// is emitted again.
export default snapshotTrigger<{ companyId: string }>({
  key: "new-or-updated-position",
  title: "New or Updated Position",
  description: "The run gets each position that is newly created or has been edited.",
  params: [{ key: "companyId", label: "Company ID", type: "string", required: true }],
  async load(params, ctx) {
    const out = await positionList.execute({ companyId: params.companyId }, ctx) as {
      positions?: unknown[];
    };
    return out.positions ?? [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  stampOf: (item) => String((item as { updated_date?: unknown }).updated_date ?? ""),
  output: [
    { key: "_id", type: "string", label: "Position ID" },
    { key: "name", type: "string", label: "Position name" },
    { key: "state", type: "string", label: "State" },
    { key: "updated_date", type: "string", label: "Updated at" },
  ],
  sample: {
    _id: "pos-101",
    name: "Support Engineer",
    state: "published",
    updated_date: "2026-11-09T10:00:00Z",
  },
});
