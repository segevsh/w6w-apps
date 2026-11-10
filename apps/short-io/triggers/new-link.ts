import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/link-list.ts";

interface Item {
  idString: string;
}

/** `GET /api/links?domain_id=…&limit=100&dateSortOrder=desc` — newest first, per the vendor's `dateSortOrder` enum. */
export default pollFromListAction({
  key: "new-link",
  title: "New Link",
  description: "The run gets each newly created link on the domain.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, dateSortOrder: "desc" }),
  items: (result) => (result as { links?: unknown[] }).links ?? [],
  idOf: (item) => String((item as Item).idString),
  params: action.params,
  output: [
    { key: "idString", type: "string", label: "Link ID" },
    { key: "originalURL", type: "string", label: "Original URL" },
    { key: "shortURL", type: "string", label: "Short URL" },
    { key: "title", type: "string", label: "Title" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    idString: "lnk_abc123",
    originalURL: "https://example.com/spring",
    shortURL: "https://go.example.com/spring",
    title: "Spring sale",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  maxPages: 1,
});
