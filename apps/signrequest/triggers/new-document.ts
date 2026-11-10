import { pollFromListAction } from "../../_shared/poll/mod.ts";
import documentList from "../actions/document-list.ts";

export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "Runs when a document is created in SignRequest.",
  action: documentList,
  input: () => ({ page: 1, limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [{ key: "uuid", type: "string", label: "Document ID" }],
  sample: { uuid: "00000000-0000-4000-8000-000000000001", name: "Agreement" },
  maxPages: 1,
});
