import type { ActionDefinition } from "@w6w/types";
import { csv, kt } from "../lib/client.ts";

interface Input {
  status?: string[] | string;
  bounceStatus?: string[] | string;
  limit?: number;
  cursor?: string;
}

/** List contact IDs, filtered by subscription and bounce status, one cursor page at a time. */
const subscriberList: ActionDefinition<Input> = {
  key: "subscriber-list",
  type: "read",
  resource: "subscriber",
  title: "List Contacts",
  description:
    "List contact IDs, filtered by subscription and bounce status, one cursor page at a time.",
  params: [
    {
      key: "status",
      label: "Subscription status",
      type: "multiselect",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "pending", label: "Pending" },
        { value: "unsubscribed", label: "Unsubscribed" },
      ],
      hint: "Defaults to subscribed only.",
    },
    {
      key: "bounceStatus",
      label: "Bounce status",
      type: "multiselect",
      options: [
        { value: "hardbounce", label: "Hard bounce" },
        { value: "softbounce", label: "Soft bounce" },
        { value: "spambounce", label: "Spam bounce" },
        { value: "nobounce", label: "No bounce" },
      ],
      hint: "Defaults to soft, spam and no bounce (hard bounces excluded).",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { min: 1, max: 500, integer: true },
      hint:
        "1-500. Always sent: without a limit the API returns every ID in one unpaginated array.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The nextCursor of the previous page. Leave empty for the first page.",
    },
  ],
  output: [
    { key: "subscriberIds", type: "array", label: "Contact IDs" },
    { key: "nextCursor", type: "string", label: "Next cursor (null on the last page)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-list");
    const body = await kt(ctx, "GET", "/subscriber", {
      query: {
        status: csv(input.status),
        bounceStatus: csv(input.bounceStatus),
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
    // With a limit the API answers { subscriberIds, nextCursor }; the legacy flat array is
    // handled too, so a vendor-side change of mind does not break a workflow.
    if (Array.isArray(body)) return { subscriberIds: body, nextCursor: null };
    const page = body as { subscriberIds?: string[]; nextCursor?: string | null };
    return { subscriberIds: page.subscriberIds ?? [], nextCursor: page.nextCursor ?? null };
  },
};

export default subscriberList;
