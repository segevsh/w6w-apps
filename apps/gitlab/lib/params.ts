import type { Param } from "@w6w/types";

/**
 * Almost every GitLab action is scoped to one project. GitLab identifies a
 * project by either its numeric id or its URL-encoded namespaced path, so this
 * single field accepts both — the client percent-encodes whatever is entered.
 */
export const projectId: Param = {
  key: "projectId",
  label: "Project",
  type: "string",
  required: true,
  hint: "Numeric project ID (e.g. `278964`) or the path `group/project`.",
};

/** Page/per-page, the shape every GitLab list endpoint uses. */
export const pagination: Param[] = [
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 20,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "GitLab caps this at 100.",
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
  { key: "iid", type: "number" as const, label: "Issue IID (project-scoped)" },
  { key: "id", type: "number" as const, label: "Issue ID (global)" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "state", type: "string" as const, label: "State" },
  { key: "web_url", type: "string" as const, label: "URL" },
];

export const mergeRequestOutput = [
  { key: "iid", type: "number" as const, label: "MR IID (project-scoped)" },
  { key: "id", type: "number" as const, label: "MR ID (global)" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "state", type: "string" as const, label: "State" },
  { key: "web_url", type: "string" as const, label: "URL" },
];
