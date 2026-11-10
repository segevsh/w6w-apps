import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listSenderIdentities from "../actions/list-sender-identities.ts";

export default pollFromListAction({
  key: "new-sender-identity",
  title: "New Sender Identity",
  description: "The run gets each newly created sender identity.",
  action: listSenderIdentities as ActionDefinition,
  input: (_params) => ({ orderBy: "created_at", order: "desc", page: 1, limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Sender Identity ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
