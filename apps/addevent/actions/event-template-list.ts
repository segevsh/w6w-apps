import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventTemplate } from "../lib/schema.ts";

/**
 * `GET /events/templates` — list this account's event landing-page templates,
 * newest first.
 *
 * A template's `id` is the value to pass as `landingPageTemplateId` on
 * Create/Update Event. `type` is documented with a single allowed value
 * (`event-landing`) and is included only so a param exists to match the wire
 * shape; it is always sent.
 */
interface Input {
  type?: string;
}

const eventTemplateList: ActionDefinition<Input> = {
  key: "event-template-list",
  type: "read",
  resource: "template",
  title: "List Event Templates",
  description: "List your custom event landing-page templates, sorted by creation date, " +
    "newest first.",
  params: [
    {
      key: "type",
      label: "Template type",
      type: "select",
      default: "event-landing",
      advanced: true,
      options: [{ value: "event-landing", label: "Event landing page (only documented value)" }],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Event templates" },
  ],

  async execute(input, ctx) {
    const items = await new AddEventClient(ctx).json<AddEventTemplate[]>("/events/templates", {
      query: { type: input.type },
    });
    return { items: items ?? [] };
  },
};

export default eventTemplateList;
