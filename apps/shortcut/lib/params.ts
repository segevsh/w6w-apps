import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, copied field-for-field from Shortcut's OpenAPI 3.0
 * document (fetched 2026-09-15 from
 * `developer.shortcut.com/api/rest/v3/shortcut.openapi.json`), not inferred.
 *
 * Every resource id below except `memberId` is a plain integer
 * (`format: int64`) — Shortcut's legacy numeric id space. `memberId` (and only
 * `memberId`) is a UUID. See `lib/client.ts` for why that split matters.
 */

export const storyTypeOptions = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "chore", label: "Chore" },
];

/** `WorkflowStateType`, used to filter Stories by where they sit in a Workflow. */
export const workflowStateTypeOptions = [
  { value: "backlog", label: "Backlog" },
  { value: "unstarted", label: "Unstarted" },
  { value: "started", label: "Started" },
  { value: "done", label: "Done" },
];

export const searchEntityTypeOptions = [
  { value: "story", label: "Story" },
  { value: "epic", label: "Epic" },
  { value: "iteration", label: "Iteration" },
  { value: "milestone", label: "Milestone" },
  { value: "objective", label: "Objective" },
];

export const searchDetailOptions = [
  { value: "full", label: "Full" },
  { value: "slim", label: "Slim (fewer fields per result)" },
];

export const storyIdParam: Param = {
  key: "storyId",
  label: "Story ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The Story's numeric id, e.g. from a `story-search` result's `id` field.",
};

export const epicIdParam: Param = {
  key: "epicId",
  label: "Epic ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const iterationIdParam: Param = {
  key: "iterationId",
  label: "Iteration ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const labelIdParam: Param = {
  key: "labelId",
  label: "Label ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const workflowIdParam: Param = {
  key: "workflowId",
  label: "Workflow ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const commentIdParam: Param = {
  key: "commentId",
  label: "Comment ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

/** The one UUID-addressed id in this app's surface. */
export const memberIdParam: Param = {
  key: "memberId",
  label: "Member ID",
  type: "string",
  required: true,
  hint: "The Member's UUID — unlike every other id in this app, Members are not addressed by " +
    "integer.",
};

export const includesDescriptionParam: Param = {
  key: "includesDescription",
  label: "Include description",
  type: "boolean",
  hint: "Whether to include the (potentially large) description field in each returned Story.",
};

export const colorParam: Param = {
  key: "color",
  label: "Color",
  type: "string",
  placeholder: "#6515dd",
  validation: { pattern: "^#[a-fA-F0-9]{6}$" },
  hint: "A 6-digit hex color, e.g. #6515dd. Named/keyword colors are rejected.",
};

/** `name`+`start_date`+`end_date` are the only required Iteration fields; dates are date-ONLY. */
export const isoDateParam = (key: string, label: string, required = false): Param => ({
  key,
  label,
  type: "date",
  required,
  placeholder: "2026-09-15",
  hint: "A date, not a date-time — e.g. 2026-09-15.",
});

export const dateTimeParam = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "datetime",
  hint,
});
