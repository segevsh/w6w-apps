import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { reviewStateOptions } from "../lib/params.ts";

/**
 * `GET /v1/search-notes` (operationId `searchNotes`) — full-text search over the notes the key's
 * user can see. Page-number pagination: zero-based `page`, `hitsPerPage` 1-100, and the
 * response's `nbPages` says how many pages exist. `highlight` carries the matching part of the
 * note ("an empty string means only the title matched"), wrapped in the pre/post tags given.
 */
interface Input {
  query?: string;
  parentNoteId?: string;
  depth?: number;
  reviewState?: string;
  page?: number;
  hitsPerPage?: number;
  highlightPreTag?: string;
  highlightPostTag?: string;
  lastEditedAfter?: string;
  lastUpdatedAfter?: string;
  includeArchived?: boolean;
}

const noteSearch: ActionDefinition<Input> = {
  key: "note-search",
  type: "search",
  resource: "note",
  title: "Search Notes",
  description: "Search notes by query, with parent, depth, review-state and date filters.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      hint: "Text to search for. Empty matches every note the key can see.",
    },
    {
      key: "parentNoteId",
      label: "Parent note ID",
      type: "string",
      hint: "Only notes under this parent note.",
    },
    {
      key: "depth",
      label: "Depth",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Only notes with exactly this many parents.",
    },
    {
      key: "reviewState",
      label: "Review state",
      type: "select",
      options: reviewStateOptions,
    },
    {
      key: "lastEditedAfter",
      label: "Edited after",
      type: "datetime",
      hint: "Only notes whose content was edited after this ISO 8601 date.",
    },
    {
      key: "lastUpdatedAfter",
      label: "Metadata updated after",
      type: "datetime",
      hint: "Only notes whose metadata changed after this ISO 8601 date.",
    },
    {
      key: "includeArchived",
      label: "Include archived",
      type: "boolean",
      hint: "Archived notes are excluded by default.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      validation: { min: 0, integer: true },
      hint: "Zero-based page number.",
    },
    {
      key: "hitsPerPage",
      label: "Hits per page",
      type: "number",
      default: 20,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "highlightPreTag",
      label: "Highlight start tag",
      type: "string",
      hint: "Injected before each match in `highlight`, e.g. `<b>`.",
    },
    {
      key: "highlightPostTag",
      label: "Highlight end tag",
      type: "string",
      hint: "Injected after each match in `highlight`, e.g. `</b>`.",
    },
  ],
  output: [
    { key: "hits", type: "array", label: "Matching notes, each with a highlight snippet" },
    { key: "nbPages", type: "number", label: "Total pages for the query" },
    { key: "page", type: "number", label: "Current (zero-based) page" },
  ],

  execute(input, ctx) {
    return new SliteClient(ctx).get("/search-notes", {
      query: input.query,
      parentNoteId: input.parentNoteId,
      depth: input.depth,
      reviewState: input.reviewState,
      page: input.page,
      hitsPerPage: input.hitsPerPage,
      highlightPreTag: input.highlightPreTag,
      highlightPostTag: input.highlightPostTag,
      lastEditedAfter: input.lastEditedAfter,
      lastUpdatedAfter: input.lastUpdatedAfter,
      includeArchived: input.includeArchived,
    });
  },
};

export default noteSearch;
