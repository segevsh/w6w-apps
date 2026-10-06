import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, unset } from "../lib/client.ts";

interface Input {
  query: string;
  folder?: string;
  type?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  sortBy?: string;
  sortDirection?: string;
  count?: number;
  offset?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "item",
  title: "Search Files and Folders",
  description:
    "Search names and text content. Results are limited to what the connected user can access. The query must be 3–100 characters and a page holds at most 20 results.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      validation: { minLength: 3, maxLength: 100 },
    },
    {
      key: "folder",
      label: "Folder",
      type: "string",
      row: "filter",
      hint: "Limit to this folder and its descendants, e.g. /Shared/Documents.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      row: "filter",
      options: [{ value: "FILE", label: "Files" }, { value: "FOLDER", label: "Folders" }],
    },
    {
      key: "modifiedAfter",
      label: "Modified after",
      type: "string",
      advanced: true,
      hint: "ISO-8601, e.g. 2026-01-01T00:00:00Z.",
    },
    {
      key: "modifiedBefore",
      label: "Modified before",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      row: "sort",
      options: [
        { value: "score", label: "Relevance" },
        { value: "last_modified", label: "Last modified" },
        { value: "size", label: "Size" },
        { value: "name", label: "Name" },
      ],
    },
    {
      key: "sortDirection",
      label: "Order",
      type: "select",
      advanced: true,
      row: "sort",
      options: [
        { value: "ascending", label: "Ascending" },
        { value: "descending", label: "Descending" },
      ],
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 1, max: 20, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 0, integer: true },
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "total_count", type: "number", label: "Total matches" },
    { key: "count", type: "number", label: "Returned" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request("/v1/search", {
      query: {
        query: input.query,
        folder: unset(input.folder),
        type: input.type,
        modified_after: unset(input.modifiedAfter),
        modified_before: unset(input.modifiedBefore),
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
        count: input.count,
        offset: input.offset,
      },
    });
  },
};

export default search;
