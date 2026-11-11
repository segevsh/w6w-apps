import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listTemplates from "../actions/list-templates.ts";

export default pollFromListAction({
  key: "new-or-updated-template",
  title: "New or Updated Template",
  description: "The run gets each message template that is newly created or edited.",
  action: listTemplates,
  input: () => ({ page: 1, pageSize: 100, sort: "-updatedAt" }),
  items: (result) => (result as { templates?: unknown[] }).templates ?? [],
  idOf: (item) => {
    const t = item as { templateId?: unknown; updatedAt?: unknown };
    return `${String(t.templateId ?? "")}:${String(t.updatedAt ?? "")}`;
  },
  output: [
    { key: "templateId", type: "number", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: { templateId: 123, name: "Welcome email", updatedAt: "2026-11-10T10:00:00Z" },
  maxPages: 1,
});
