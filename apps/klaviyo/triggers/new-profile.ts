import { pollFromListAction } from "../../_shared/poll/mod.ts";
import profiles from "../actions/get-profiles.ts";

export default pollFromListAction({
  key: "new-profile",
  title: "New Profile",
  description: "The run gets each newly created profile.",
  action: profiles,
  input: () => ({ sort: "-created", pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
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
