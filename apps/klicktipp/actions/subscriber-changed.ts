import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

interface Input {
  from: number;
  cursor?: string;
  limit?: number;
}

/** List the IDs of contacts changed since a Unix timestamp, one cursor page at a time. */
const subscriberChanged: ActionDefinition<Input> = {
  key: "subscriber-changed",
  type: "read",
  resource: "subscriber",
  title: "List Changed Contacts",
  description:
    "List the IDs of contacts changed since a Unix timestamp, one cursor page at a time.",
  params: [
    {
      key: "from",
      label: "Changed since (Unix seconds)",
      type: "number",
      required: true,
      validation: { min: 0, integer: true },
      hint: "Changes at exactly this timestamp are included.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { min: 1, max: 200, integer: true },
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
    ctx.log("info", "subscriber-changed");
    const body = await kt(ctx, "GET", "/subscriber/changed", {
      query: { from: input.from, cursor: input.cursor, limit: input.limit ?? 100 },
    }) as { subscriberIds?: string[]; nextCursor?: string | null };
    return { subscriberIds: body.subscriberIds ?? [], nextCursor: body.nextCursor ?? null };
  },
};

export default subscriberChanged;
