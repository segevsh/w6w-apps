import type { Param } from "@w6w/types";

/**
 * Almost every GitHub action is scoped to one repository. Declaring the pair
 * once keeps the ~20 actions consistent, and `row` puts them side by side —
 * they read as a single `owner/repo` coordinate.
 */
export const owner: Param = {
  key: "owner",
  label: "Owner",
  type: "string",
  required: true,
  row: "repo",
  hint: "User or organisation that owns the repository.",
};

export const repository: Param = {
  key: "repository",
  label: "Repository",
  type: "string",
  required: true,
  row: "repo",
  hint: "Repository name, without the owner prefix.",
};

/** Page/per-page, the shape every GitHub list endpoint uses. */
export const pagination: Param[] = [
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 30,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "GitHub caps this at 100.",
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    validation: { min: 1, integer: true },
  },
];

export const issueOutput = [
  { key: "number", type: "number" as const, label: "Issue number" },
  { key: "id", type: "number" as const, label: "Issue ID" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "state", type: "string" as const, label: "State" },
  { key: "html_url", type: "string" as const, label: "URL" },
];
