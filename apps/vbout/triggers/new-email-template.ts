import emailTemplateList from "../actions/email-template-list.ts";
import { itemsOf, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /1/emailmarketing/getemailtemplates.json` through `email-template-list`: no paging
 * parameters, every template of the account in one response
 * (https://developers.vbout.com/scripts/openapi.json, `EmailMarketing/GetEmailTemplates`), so the
 * whole collection is snapshot-diffed (additions only).
 */
export default snapshotTrigger({
  key: "new-email-template",
  title: "New Email Template",
  description: "The run gets each email template newly added to the Vbout account.",
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "preview_link", type: "string", label: "Preview link" },
  ],
  sample: {
    id: "185200",
    name: "Template 1",
    preview_link: "https://app.vbout.com/ricks/template/185200/",
  },
  rows: async (_params, ctx) =>
    itemsOf(await emailTemplateList.execute({} as never, ctx), "templates"),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});
