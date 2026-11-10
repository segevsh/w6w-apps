import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listDocuments from "../actions/list-documents.ts";

export default pollFromListAction<{ doctype?: string }>({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly created document in the selected DocType.",
  action: listDocuments as never,
  input: (params) => ({
    doctype: params.doctype,
    fields: "*",
    orderBy: "creation desc",
    limitStart: 0,
    limitPageLength: 100,
  }),
  params: [{ key: "doctype", label: "DocType", type: "string", required: true }],
  items: (result) =>
    Array.isArray((result as { records?: unknown[] }).records)
      ? (result as { records: unknown[] }).records
      : [],
  idOf: (item) => String((item as { name?: unknown }).name ?? ""),
  output: [{ key: "name", type: "string", label: "Document name" }],
  sample: { name: "LEAD-0001", creation: "2026-11-09 12:00:00" },
  maxPages: 1,
});
