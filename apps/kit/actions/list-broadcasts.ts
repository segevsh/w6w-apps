import type { ActionDefinition } from "@w6w/types";
import {
  KitClient,
  type KitList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  status?: "draft" | "scheduled" | "sending" | "completed" | "aborted";
  sentAfter?: string;
  sentBefore?: string;
  slim?: boolean;
}

const listBroadcasts: ActionDefinition<Input> = {
  key: "list-broadcasts",
  type: "read",
  resource: "broadcast",
  title: "List Broadcasts",
  description:
    "List broadcasts with their content, targeting and publishing settings, one cursor page at a time. Delivery and engagement stats are not included in this response.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "scheduled", label: "Scheduled" },
        { value: "sending", label: "Sending" },
        { value: "completed", label: "Completed" },
        { value: "aborted", label: "Aborted" },
      ],
    },
    { key: "sentAfter", label: "Sent after", type: "date", hint: "Format `yyyy-mm-dd`." },
    { key: "sentBefore", label: "Sent before", type: "date", hint: "Format `yyyy-mm-dd`." },
    {
      key: "slim",
      label: "Slim response",
      type: "boolean",
      hint:
        "Omit the expensive fields (`content`, `public_url`, `email_address`, `email_template`, `subscriber_filter`).",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "broadcasts", type: "array", label: "Broadcasts" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"broadcasts">>("/broadcasts", {
      query: {
        ...pageQuery(input),
        status: input.status,
        sent_after: input.sentAfter,
        sent_before: input.sentBefore,
        slim: input.slim,
      },
    });
  },
};

export default listBroadcasts;
