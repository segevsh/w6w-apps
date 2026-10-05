import type { ActionDefinition } from "@w6w/types";
import { GranolaClient, type GranolaNoteSummary } from "../lib/client.ts";
import { cursorParam, pageSizeParam } from "../lib/params.ts";

/**
 * `GET /v1/notes` — one page of notes, newest-first as the vendor orders them.
 * Returns summaries only (id, title, owner, timestamps); fetch the body with
 * Get Note. Dates accept `YYYY-MM-DD` or a full ISO 8601 timestamp.
 */
interface Input {
  createdBefore?: string;
  createdAfter?: string;
  updatedAfter?: string;
  folderId?: string;
  cursor?: string;
  pageSize?: number;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List meeting notes, filterable by created/updated date and folder.",
  params: [
    {
      key: "createdAfter",
      label: "Created after",
      type: "string",
      hint: "Date (2026-01-27) or timestamp (2026-01-27T15:30:00Z).",
    },
    { key: "createdBefore", label: "Created before", type: "string" },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      hint: "Use this to poll for notes that changed since the last run.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      placeholder: "fol_...",
      hint: "Notes in this folder and any of its child folders. IDs come from List Folders.",
      validation: { pattern: "^fol_[a-zA-Z0-9]{14}$" },
    },
    cursorParam,
    pageSizeParam(30, "notes"),
  ],
  output: [
    { key: "notes", type: "array", label: "Notes (id, title, owner, created_at, updated_at)" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<
      { notes: GranolaNoteSummary[]; hasMore: boolean; cursor: string | null }
    >("/notes", {
      query: {
        created_before: input.createdBefore,
        created_after: input.createdAfter,
        updated_after: input.updatedAfter,
        folder_id: input.folderId,
        cursor: input.cursor,
        page_size: input.pageSize,
      },
    });
  },
};

export default noteList;
