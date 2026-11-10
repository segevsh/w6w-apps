import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import formList from "../actions/form-list.ts";

interface Params {
  organizationId?: string;
}

// VideoAsk: GET /forms "Forms are sorted by creation date in descending order", paged with
// limit/offset (https://developers.videoask.com/, Forms > Retrieve all forms, verified 2026-11-10).
// Newest-first, brief 9.1 a. `form-search` returns the same forms (oldest-first), so it is
// covered by this trigger.
export default pollFromListAction<Params>({
  key: "new-form",
  title: "New Form",
  description: "The run gets each newly created VideoAsk form.",
  action: formList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ limit: 50, offset: 0, organizationId }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { form_id?: unknown }).form_id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  output: [
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "share_id", type: "string", label: "Share ID" },
    { key: "share_url", type: "string", label: "Share URL" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    form_id: "form_1",
    title: "My VideoAsk",
    share_id: "fabc123",
    share_url: "https://www.videoask.com/fabc123",
    created_at: "2026-11-09T11:51:24.693974Z",
  },
  maxPages: 1,
});
