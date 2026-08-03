import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  limit?: number;
  page?: number;
}

/**
 * `GET /api/segments` — page paginated, and the only listing MailerLite offers
 * for segments (there is no create endpoint; segments are defined in the app).
 * This is the lookup for `create-campaign`'s `segments` param. An account can
 * hold at most 250 segments.
 */
const listSegments: ActionDefinition<Input> = {
  key: "list-segments",
  type: "read",
  resource: "segment",
  title: "List Segments",
  description: "List the account's segments with their subscriber counts and engagement stats.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Segments" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>("/segments", {
      query: {
        limit: input.limit ?? 25,
        page: input.page ?? 1,
      },
    });
  },
};

export default listSegments;
