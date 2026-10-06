import type { ActionDefinition } from "@w6w/types";
import { call, pick, requireStr } from "../lib/client.ts";
import { int, select, str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const whatsappTemplatesList: ActionDefinition<Input> = {
  key: "whatsapp-templates-list",
  type: "search",
  resource: "whatsapp",
  title: "List WhatsApp Templates",
  description:
    "List the WhatsApp templates linked to an integrated number (MSG91 returns at most 500).",
  params: [
    str("number", "Integrated number", { required: true, hint: "With country code." }),
    str("templateName", "Template name"),
    select("templateStatus", "Status", ["approved", "pending", "rejected"]),
    str("templateLanguage", "Language"),
    int("pageSize", "Page size", {
      hint: "Set page size and page number together for a paginated response.",
    }),
    int("pageNumber", "Page number"),
  ],
  output: [{ key: "templates", type: "object", label: "MSG91's response" }],

  async execute(input, ctx) {
    const number = encodeURIComponent(requireStr("number", input.number));
    const paged = input.pageSize && input.pageNumber;
    const res = await call(ctx, "GET", `/whatsapp/get-template-client/${number}`, {
      query: {
        ...pick({
          template_name: input.templateName,
          template_status: input.templateStatus,
          template_language: input.templateLanguage,
        }, ["template_name", "template_status", "template_language"]),
        ...(paged
          ? { pagination: "true", page_size: input.pageSize, page_num: input.pageNumber }
          : {}),
      },
    });
    return { templates: res.data ?? res };
  },
};

export default whatsappTemplatesList;
