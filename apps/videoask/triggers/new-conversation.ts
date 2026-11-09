import conversationList from "../actions/conversation-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

interface Params {
  formId: string;
  organizationId?: string;
}

export default pollFromListAction<Params>({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each new VideoAsk conversation for a form.",
  action: conversationList as unknown as ActionDefinition,
  input: ({ formId, organizationId }) => ({
    formId,
    organizationId,
    limit: 100,
    orderBy: "-latest_interaction",
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { contact_id: unknown }).contact_id),
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    { key: "organizationId", label: "Organization ID", type: "string" },
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],
  sample: { contact_id: "contact_1" },
  maxPages: 1,
});
