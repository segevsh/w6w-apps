import { snapshotTrigger } from "../lib/triggers.ts";
import positionList from "../actions/position-list.ts";

// Without `page_size` the positions endpoint returns every matching position in one response
// (https://developer.breezy.hr/reference/listpositions, verified 2026-11-10), and a company has
// a bounded set of them, so each check diffs the ids (snapshot, added only; archived positions
// are left out by Breezy unless asked for).
export default snapshotTrigger<{ companyId: string }>({
  key: "new-position",
  title: "New Position",
  description: "The run gets each newly created position.",
  params: [{ key: "companyId", label: "Company ID", type: "string", required: true }],
  async load(params, ctx) {
    const out = await positionList.execute({ companyId: params.companyId }, ctx) as {
      positions?: unknown[];
    };
    return out.positions ?? [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Position ID" },
    { key: "name", type: "string", label: "Position name" },
    { key: "state", type: "string", label: "State" },
    { key: "creation_date", type: "string", label: "Created at" },
  ],
  sample: {
    _id: "pos-101",
    name: "Support Engineer",
    state: "published",
    creation_date: "2026-11-01T10:00:00Z",
  },
});
