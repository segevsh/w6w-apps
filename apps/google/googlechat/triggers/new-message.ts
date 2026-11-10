import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listMessages from "../actions/list-messages.ts";

export default pollFromListAction<{ space: string }>({
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly posted Chat message.",
  action: listMessages as unknown as ActionDefinition,
  input: (params) => ({ space: String(params.space ?? ""), orderBy: "DESC", pageSize: 200 }),
  params: [{ key: "space", label: "Space", type: "string", required: true }],
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [{ key: "name", type: "string", label: "Message resource name" }],
  sample: { name: "spaces/AAA/messages/BBB" },
  maxPages: 1,
});
