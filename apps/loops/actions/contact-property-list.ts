import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/properties` — verified against Loops' OpenAPI document.
 *
 * Worth reading before any contact write: a custom property that does not exist
 * here is rejected on the way in, so this is how a workflow finds out what it
 * is allowed to set.
 */
const action: ActionDefinition = {
  key: "contact-property-list",
  type: "read",
  resource: "contact-property",
  title: "List contact properties",
  description: "List the contact properties this workspace defines.",
  params: [
    {
      key: "list",
      label: "Which Properties",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "custom", label: "Custom only" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    ctx.log("info", "listing Loops contact properties", {});
    return await new LoopsClient(ctx).request("/contacts/properties", {
      query: { list: String(p.list ?? "all") },
    });
  },
};

export default action;
