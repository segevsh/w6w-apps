import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/results-list.ts";

export default pollFromListAction<{
  parserId: string;
  format?: string;
  list?: string;
  limit?: number;
  date?: string;
  remoteId?: string;
  includeProcessingQueue?: boolean;
  sortBy?: string;
  sortOrder?: string;
}>({
  key: "new-result",
  title: "New Parsed Result",
  description: "The run gets each newly parsed document result.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    list: "last_uploaded",
    sortBy: "uploaded_at",
    sortOrder: "DESC",
    limit: 100,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { document_id: string | number }).document_id),
  params: action.params,
  output: [{ key: "document_id", type: "string", label: "Document ID" }],
  sample: { document_id: "doc_123", uploaded_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
