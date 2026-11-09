import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listDocuments from "../actions/list-documents.ts";

export default pollFromListAction<{ doctype?: string }>({
  key: "new-or-updated-document",
  title: "New or Updated Document",
  description: "The run gets each newly created or updated document in the selected DocType.",
  action: listDocuments as never,
  input: (params) => ({
    doctype: params.doctype,
    fields: "*",
    orderBy: "modified desc",
    limitStart: 0,
    limitPageLength: 100,
  }),
  params: [{ key: "doctype", label: "DocType", type: "string", required: true }],
  items: (result) =>
    Array.isArray((result as { records?: unknown[] }).records)
      ? (result as { records: unknown[] }).records
      : [],
  idOf: (item) =>
    `${String((item as { name?: unknown }).name ?? "")}:${
      String((item as { modified?: unknown }).modified ?? "")
    }`,
  output: [{ key: "name", type: "string", label: "Document name" }],
  sample: { name: "LEAD-0001", modified: "2026-11-09 12:00:00" },
  maxPages: 1,
});
