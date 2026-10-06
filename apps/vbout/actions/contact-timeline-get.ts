import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getcontacttimeline.json` — Return the activity timeline of a contact.
 */
interface Input {
  id: string;
  include?: string;
}

const contactTimelineGet: ActionDefinition<Input> = {
  key: "contact-timeline-get",
  type: "read",
  resource: "contact",
  title: "Get Contact Timeline",
  description: "Return the activity timeline of a contact.",
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
    },
    {
      key: "include",
      label: "Include",
      type: "select",
      hint: "Extra detail to return with the timeline.",
      options: [{ value: "utm", label: "utm" }, { value: "automated", label: "automated" }],
    },
  ],
  output: [
    { key: "timeline", type: "object", label: "Timeline: { data[] }" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getcontacttimeline", {
      id: input.id,
      include: input.include,
    });
  },
};

export default contactTimelineGet;
