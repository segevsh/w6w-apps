import pageLeadList from "../actions/page-lead-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

interface Params {
  pageId: string;
}

export default pollFromListAction<Params>({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each new form lead for an Unbounce page.",
  action: pageLeadList as unknown as ActionDefinition,
  input: ({ pageId }) => ({ pageId, sortOrder: "desc", limit: 100 }),
  items: (result) => (result as { leads?: unknown[] }).leads ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  params: [{ key: "pageId", label: "Page ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: "lead_1" },
  maxPages: 1,
});
