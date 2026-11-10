import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import { accountParams } from "../lib/triggers.ts";
import textMessageList from "../actions/text-message-list.ts";

/** Conversations come newest-first by their most recent message (https://apidocs.callrail.com/). */
export default pollFromListAction<{ accountId: string; companyId?: string }>({
  key: "new-or-updated-text-conversation",
  title: "New or Updated Text Message Conversation",
  description:
    "The run gets each text message conversation when it starts and each time it gets a new message.",
  action: textMessageList as unknown as ActionDefinition,
  params: accountParams,
  input: (params) => ({ ...params, fields: "last_message_at", page: 1, perPage: 100 }),
  items: (result) => (result as { conversations?: unknown[] }).conversations ?? [],
  idOf: (item) =>
    `${(item as { id: unknown }).id}:${
      (item as { last_message_at?: unknown }).last_message_at ?? ""
    }`,
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "customer_name", type: "string", label: "Customer name" },
    { key: "customer_phone_number", type: "string", label: "Customer phone number" },
    { key: "state", type: "string", label: "State" },
    { key: "last_message_at", type: "string", label: "Last message at" },
  ],
  sample: {
    id: "KZaGR",
    company_id: "COM1",
    customer_name: "Sample Customer",
    customer_phone_number: "+15555550100",
    state: "active",
    last_message_at: "2026-11-10T07:46:28.000Z",
  },
});
