import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventTemplate } from "../lib/schema.ts";

/**
 * `GET /calendars/templates` — list this account's calendar landing-page *or*
 * embeddable-calendar templates, newest first.
 *
 * A template's `id` is the value to pass as `landingPageTemplateId` or
 * `embeddableCalendarTemplateId` on Create/Update Calendar, depending on which
 * `type` it is.
 */
interface Input {
  type?: string;
}

const calendarTemplateList: ActionDefinition<Input> = {
  key: "calendar-template-list",
  type: "read",
  resource: "template",
  title: "List Calendar Templates",
  description: "List your custom calendar landing-page or embeddable-calendar templates, " +
    "sorted by creation date, newest first.",
  params: [
    {
      key: "type",
      label: "Template type",
      type: "select",
      default: "calendar-landing",
      options: [
        { value: "calendar-landing", label: "Calendar landing page (default)" },
        { value: "calendar-embed", label: "Embeddable calendar" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Calendar templates" },
  ],

  async execute(input, ctx) {
    const items = await new AddEventClient(ctx).json<AddEventTemplate[]>(
      "/calendars/templates",
      { query: { type: input.type } },
    );
    return { items: items ?? [] };
  },
};

export default calendarTemplateList;
