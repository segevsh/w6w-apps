import { pollFromListAction } from "../../_shared/poll/mod.ts";
import profiles from "../actions/get-profiles.ts";

export default pollFromListAction({
  key: "new-or-updated-profile",
  title: "New or Updated Profile",
  description: "The run gets each newly created or updated profile.",
  action: profiles,
  input: () => ({ sort: "-updated", pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const profile = item as { id?: unknown; attributes?: { updated?: unknown } };
    return `${String(profile.id ?? "")}:${String(profile.attributes?.updated ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Profile ID" }],
  sample: { id: "01HXYZPROFILE" },
  nextPageInput: (input, result) => {
    const next = (result as { links?: { next?: unknown } }).links?.next;
    if (typeof next !== "string") return undefined;
    const cursor = new URL(next).searchParams.get("page[cursor]");
    return cursor ? { ...input, pageCursor: cursor } : undefined;
  },
  maxPages: 5,
});
