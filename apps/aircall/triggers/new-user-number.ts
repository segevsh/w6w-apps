import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-number-list.ts";

// One User is assigned a handful of Numbers, so the whole collection is one request of up to
// 50 (`per_page` max 50, https://developer.aircall.io/api-references/ "List all Numbers of a
// User V2", verified 2026-11-10). The endpoint has no sort worth relying on, so each check diffs
// the ids against the previous check (snapshot, added only).
export default snapshotTrigger<{ userId: string }>({
  key: "new-user-number",
  title: "New Number for a User",
  description: "The run gets each Number newly assigned to the chosen User.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "Numeric ID of the User to watch (see List Users).",
    },
  ],
  async load(params, ctx) {
    const out = await action.execute({ userId: params.userId, page: 1, perPage: 50 }, ctx) as {
      items?: unknown[];
    };
    return out.items ?? [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Number ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "digits", type: "string", label: "Phone number" },
  ],
  sample: { id: 1234, name: "Support line", digits: "+1 800 123 1234" },
});
