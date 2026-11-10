import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/subscriber-find.ts";

const trigger = pollFromListAction({
  key: "new-subscriber",
  title: "New Subscriber",
  description: "The run gets each new subscriber on the selected AWeber list.",
  action: action as unknown as ActionDefinition,
  input: (params) => {
    const p = params as { accountId?: string; listId?: string };
    return {
      accountId: p.accountId,
      listId: p.listId,
      sortKey: "subscribed_at",
      sortOrder: "desc",
      size: 100,
    };
  },
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => String((item as { id?: number }).id),
  params: (action.params ?? []).filter((p) => p.key === "accountId" || p.key === "listId"),
  output: [
    { key: "id", type: "number", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "subscribed_at", type: "string", label: "Subscribed at" },
  ],
  sample: {
    id: 111,
    email: "ada@example.com",
    name: "Ada",
    status: "subscribed",
    subscribed_at: "2026-11-09T10:00:00-05:00",
  },
  maxPages: 1,
});

export default trigger;
