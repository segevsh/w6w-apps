import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, Param } from "@w6w/types";
import documentSearch from "../actions/document-search.ts";

const param = (key: string): Param => documentSearch.params!.find((p) => p.key === key)!;

/**
 * Typesense has no built-in creation order, so the order is the user's: `sortBy` (Typesense's
 * documented `sort_by`, https://typesense.org/docs/28.0/api/search.html) must put the newest
 * document first, e.g. `created_at:desc` on a field the collection's schema sorts on.
 */
export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description:
    "The run gets each new document in a collection, polled through document-search with q=* " +
    "and the newest-first sort you supply.",
  action: documentSearch as unknown as ActionDefinition,
  input: (
    params: { collection?: string; queryBy?: string; sortBy?: string; filterBy?: string },
  ) => {
    if (!String(params.sortBy ?? "").trim()) {
      throw new Error(
        "`sortBy` is required: name a sortable field, newest first (created_at:desc)",
      );
    }
    return {
      collection: params.collection,
      q: "*",
      queryBy: params.queryBy,
      sortBy: params.sortBy,
      filterBy: params.filterBy,
      perPage: 100,
      page: 1,
      strict: true,
    };
  },
  params: [
    param("collection"),
    param("queryBy"),
    {
      ...param("sortBy"),
      required: true,
      placeholder: "created_at:desc",
      hint: "Typesense sort_by that puts the newest document first, on a sortable field of the " +
        "collection (for example a created_at timestamp, descending). Without a newest-first " +
        "order the trigger cannot see new documents.",
    },
    param("filterBy"),
  ],
  items: (result) => (result as { documents?: unknown[] }).documents ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Document ID" }],
  sample: { id: "124", name: "boot" },
  maxPages: 1,
});
