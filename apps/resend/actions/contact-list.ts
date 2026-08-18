import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /contacts` — verified against Resend's OpenAPI document. Like
 * `/audiences`, the response is `{ object, data }` with no `has_more`, so
 * there is nothing to page.
 */
const action: ActionDefinition = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List contacts",
  description: "List contacts, optionally filtered to one segment.",
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      default: "",
      hint: "Optional. Only contacts in this segment.",
    },
  ],
  output: [
    { key: "object", type: "string", label: "Object type" },
    { key: "data", type: "array", label: "Contacts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    ctx.log("info", "listing Resend contacts");

    return await new ResendClient(ctx).request("/contacts", {
      query: { segment_id: (p.segmentId as string) || undefined },
    });
  },
};

export default action;
