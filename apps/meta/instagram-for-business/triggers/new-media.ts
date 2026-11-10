import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listMedia from "../actions/list-media.ts";

export default pollFromListAction({
  key: "new-media",
  title: "New Media",
  description: "The run gets each newly published Instagram media item.",
  action: listMedia as unknown as ActionDefinition,
  input: (params: { igUserId: string }) => ({ ...params, limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "igUserId", label: "Instagram Account ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Media ID" }],
  sample: { id: "media-new", caption: "New post" },
  maxPages: 1,
});
