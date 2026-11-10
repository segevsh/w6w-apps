import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listTemplates from "../actions/list-templates.ts";

export default pollFromListAction({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly created message template.",
  action: listTemplates,
  input: () => ({ page: 1, pageSize: 100, sort: "-createdAt" }),
  items: (result) => (result as { templates?: unknown[] }).templates ?? [],
  idOf: (item) => String((item as { templateId?: unknown }).templateId ?? ""),
  output: [
    { key: "templateId", type: "number", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    templateId: 123,
    name: "Welcome email",
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
