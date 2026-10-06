import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getemailtemplates.json` — Return the account's email templates.
 */
type Input = Record<string, never>;

const emailTemplateList: ActionDefinition<Input> = {
  key: "email-template-list",
  type: "read",
  resource: "template",
  title: "List Email Templates",
  description: "Return the account's email templates.",
  params: [],
  output: [
    { key: "templates", type: "object", label: "The templates, as returned by VBOUT" },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getemailtemplates");
  },
};

export default emailTemplateList;
