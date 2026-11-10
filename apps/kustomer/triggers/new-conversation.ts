import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listAction from "../actions/conversation-list.ts";

const action = listAction as unknown as ActionDefinition;

export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description:
    "The run gets each newly created conversation, oldest first, polled from the existing `conversation-list` action with `sort=desc` (newest first; the vendor documents `sort` on this endpoint only as a direction, and on its sibling list endpoints as ordering by `createdAt`).",
  action,
  params: [],
  input: () => ({ page: 1, pageSize: 100, sort: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    {
      key: "attributes",
      type: "object",
      label: "Conversation attributes (name, status, tags, createdAt)",
    },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d0e",
    type: "conversation",
    attributes: {
      name: "Where is my order?",
      status: "open",
      createdAt: "2026-11-09T10:00:00.000Z",
    },
  },
  maxPages: 1,
});
