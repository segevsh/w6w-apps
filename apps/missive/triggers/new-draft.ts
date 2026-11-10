import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import draftsList from "../actions/conversation-drafts-list.ts";

export default pollFromListAction({
  key: "new-draft",
  title: "New Conversation Draft",
  description: "The run gets each new draft on the selected conversation.",
  action: draftsList as unknown as ActionDefinition,
  input: (params: { conversationId: string }) => ({
    id: params.conversationId,
    limit: 10,
    until: 0,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "conversationId", label: "Conversation ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Draft ID" }],
  sample: { id: "draft-new", delivered_at: 1794225600 },
  maxPages: 1,
});
