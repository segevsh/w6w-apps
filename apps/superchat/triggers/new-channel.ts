import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/channel-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-channel",
  title: "New Channel",
  description: "The run gets each newly created Superchat channel.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Channel ID" }],
  sample: { id: "channel_1" },
  maxPages: 1,
});
