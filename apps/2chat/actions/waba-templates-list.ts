import type { ActionDefinition } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
  page?: number;
  limit?: number;
}

const wabaTemplatesList: ActionDefinition<Input> = {
  key: "waba-templates-list",
  type: "read",
  resource: "template",
  title: "List WABA Templates",
  description:
    "List the message templates of a WABA number, 10 to 200 per page (GET /waba/templates). Only " +
    "APPROVED templates can be sent.",
  params: [
    {
      key: "phoneNumber",
      label: "WABA number",
      type: "string",
      required: true,
      hint: "E.164, with the leading +.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Zero-based. The WABA endpoints name this `page`, not `page_number`.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: "10 to 200. Default 10.",
    },
  ],
  output: [
    { key: "templates", type: "array", label: "uuid, name, status, category, template_content …" },
    { key: "total", type: "number", label: "All templates" },
    { key: "next_page", type: "number", label: "Next page index, null on the last" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get("/waba/templates", {
      phone_number: input.phoneNumber,
      page: input.page ?? 0,
      limit: input.limit,
    });
  },
};

export default wabaTemplatesList;
