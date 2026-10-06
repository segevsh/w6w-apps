import type { ActionDefinition } from "@w6w/types";
import { CURSOR_OUTPUT, type CursorInput, cursorParams } from "../lib/params.ts";
import { HexClient, type HexCursorPage, toList } from "../lib/client.ts";

/**
 * `GET /v1/projects` — projects the token can see, newest-created first by default.
 *
 * Cursor-paginated: pass the response's `pagination.after` back as `after`. Archived,
 * trashed, unlisted and component projects are hidden unless asked for.
 */
interface Input extends CursorInput {
  statuses?: string[] | string;
  categories?: string[] | string;
  creatorEmail?: string;
  ownerEmail?: string;
  collectionId?: string;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  includeUnlisted?: boolean;
  includeComponents?: boolean;
  includeSharing?: boolean;
  sortBy?: string;
  sortDirection?: string;
}

const flagParam = (key: string, label: string, hint: string) => ({
  key,
  label,
  type: "boolean" as const,
  hint,
});

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description:
    "List Hex projects the token can view, with optional status, owner and collection filters.",
  params: [
    { key: "statuses", label: "Statuses", type: "string", hint: "Comma-separated status names." },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      hint: "Comma-separated category names.",
    },
    { key: "creatorEmail", label: "Creator email", type: "string" },
    { key: "ownerEmail", type: "string", label: "Owner email" },
    { key: "collectionId", label: "Collection ID", type: "string" },
    flagParam("includeArchived", "Include archived", "Also return archived projects."),
    flagParam("includeTrashed", "Include trashed", "Also return projects in the trash."),
    flagParam("includeUnlisted", "Include unlisted", "Also return unlisted projects."),
    flagParam("includeComponents", "Include components", "Also return component projects."),
    flagParam("includeSharing", "Include sharing", "Add sharing metadata to each project."),
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "CREATED_AT", label: "Created" },
        { value: "LAST_EDITED_AT", label: "Last edited" },
        { value: "LAST_PUBLISHED_AT", label: "Last published" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "DESC", label: "Descending" }, { value: "ASC", label: "Ascending" }],
    },
    ...cursorParams(100),
  ],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>("/projects", {
      query: {
        statuses: toList(input.statuses),
        categories: toList(input.categories),
        creatorEmail: input.creatorEmail,
        ownerEmail: input.ownerEmail,
        collectionId: input.collectionId,
        includeArchived: input.includeArchived,
        includeTrashed: input.includeTrashed,
        includeUnlisted: input.includeUnlisted,
        includeComponents: input.includeComponents,
        includeSharing: input.includeSharing,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
        limit: input.limit,
        after: input.after,
      },
    });
  },
};

export default projectList;
