import type { ActionDefinition } from "@w6w/types";
import {
  DOMAIN_ID_FILTER,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";
import { listOf } from "../lib/factories.ts";

interface Input extends PageInput, Record<string, unknown> {
  domainId?: string;
  status?: string;
}

const listScheduledMessages: ActionDefinition<Input> = listOf<Input>({
  key: "list-scheduled-messages",
  resource: "scheduled-message",
  title: "List Scheduled Messages",
  description:
    "List emails queued with `sendAt` (GET /v1/message-schedules), with `send_at`, `status` and `status_message`.",
  path: () => "/message-schedules",
  params: [
    DOMAIN_ID_FILTER,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["scheduled", "sent", "error"].map((v) => ({ value: v, label: v })),
    },
    ...PAGE_PARAMS,
  ],
  query: (i) => ({ ...pageQuery(i), domain_id: i.domainId, status: i.status }),
  output: PAGE_OUTPUT,
});

export default listScheduledMessages;
