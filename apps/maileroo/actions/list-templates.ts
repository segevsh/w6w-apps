import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

interface Input {
  search?: string;
}

/** `GET /v1/templates` (scope `templates.read`) — an unpaginated array. */
const listTemplates: ActionDefinition<Input> = {
  key: "list-templates",
  type: "search",
  resource: "template",
  title: "List Templates",
  description:
    "List email templates (ID, name, type, preview). The ID feeds Send Templated Email " +
    "and Send Bulk Emails. Account API Key (templates.read).",
  params: [{ key: "search", label: "Search", type: "string", hint: "Filter by template name." }],
  output: [{
    key: "templates",
    type: "array",
    label: "id, type (editor|html|url|zip), template_name, preview_image, preview_url, processed",
  }],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/templates", {
      query: { search: input.search?.trim() },
    });
    return { templates: Array.isArray(data) ? data : [] };
  },
};

export default listTemplates;
