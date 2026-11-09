import { pollFromListAction } from "../../_shared/poll/mod.ts";
import documentList from "../actions/document-list.ts";

export default pollFromListAction<{ collectionPath?: string; orderBy?: string }>({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly listed document in the selected collection.",
  action: documentList,
  input: (params) => ({
    collectionPath: params.collectionPath,
    pageSize: 100,
    orderBy: params.orderBy ?? "__name__ desc",
  }),
  params: [
    { key: "collectionPath", label: "Collection path", type: "string", required: true },
    { key: "orderBy", label: "Newest-first order", type: "string", default: "__name__ desc" },
  ],
  items: (result) =>
    Array.isArray((result as { documents?: unknown[] }).documents)
      ? (result as { documents: unknown[] }).documents
      : [],
  idOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [{ key: "name", type: "string", label: "Document path" }],
  sample: { name: "projects/demo/databases/(default)/documents/leads/lead-1" },
  maxPages: 1,
});
