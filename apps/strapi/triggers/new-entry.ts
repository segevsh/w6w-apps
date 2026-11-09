import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entryList from "../actions/entry-list.ts";
import { collectionParam } from "../lib/params.ts";

/** Polls `entry-list` (`GET /api/<collection>`) sorted `createdAt:desc` for entries not yet seen. */
export default pollFromListAction<{ collection: string }>({
  key: "new-entry",
  title: "New Entry",
  description:
    "The run gets each newly created entry of the chosen Strapi collection, newest first by createdAt.",
  action: entryList as unknown as ActionDefinition,
  input: (params) => ({
    collection: params.collection,
    sort: "createdAt:desc",
    page: 1,
    pageSize: 100,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const e = item as { documentId?: string; id?: string | number };
    return String(e.documentId ?? e.id);
  },
  params: [collectionParam],
  output: [
    { key: "documentId", type: "string", label: "Document ID (Strapi 5)" },
    { key: "id", type: "number", label: "Entry ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
    { key: "publishedAt", type: "string", label: "Published at" },
  ],
  sample: {
    id: 12,
    documentId: "a1b2c3d4e5f6g7h8i9j0k1l2",
    title: "Hello",
    createdAt: "2026-11-09T09:30:00.000Z",
    updatedAt: "2026-11-09T09:30:00.000Z",
    publishedAt: "2026-11-09T09:30:00.000Z",
  },
  maxPages: 1,
});
