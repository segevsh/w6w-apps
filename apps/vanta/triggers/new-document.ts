import documentList from "../actions/document-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/documents` through `document-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-document",
  title: "New Document",
  description: "The run gets each evidence document newly added to Vanta.",
  action: documentList,
  listKey: "documents",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "category", type: "string", label: "Category" },
    { key: "uploadStatus", type: "string", label: "Upload status" },
  ],
  sample: {
    id: "document-1",
    title: "Information security policy",
    category: "Policies",
    uploadStatus: "OK",
  },
});
