import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import documentList from "../actions/document-list.ts";

type DocumentListInput = Parameters<NonNullable<typeof documentList.execute>>[0];

function idOf(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("Parseur document has no stable id");
  return String(id);
}

export default pollFromListAction<DocumentListInput>({
  key: "new-document",
  title: "New Document",
  description: "The run gets each document newly returned by List Documents.",
  action: documentList as unknown as ActionDefinition,
  input: (params) => ({ ...params, ordering: "-created", page: 1, pageSize: 100 }),
  items: (result) => ((result as { results?: unknown[] }).results ?? []),
  idOf,
  params: documentList.params,
  output: [{ key: "id", type: "string", label: "Document ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
