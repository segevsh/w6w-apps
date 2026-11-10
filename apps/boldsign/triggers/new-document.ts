import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/document-list.ts";

const trigger = pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly active BoldSign document.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, page: 1, pageSize: 100 }),
  items: (result) => (result as { result?: unknown[] }).result ?? [],
  idOf: (item) =>
    String(
      (item as { documentId?: string; id?: string }).documentId ?? (item as { id?: string }).id,
    ),
  params: action.params,
  output: [{ key: "documentId", type: "string", label: "Document ID" }],
  sample: { documentId: "doc_1", title: "A new document" },
  maxPages: 1,
});

export default trigger;
