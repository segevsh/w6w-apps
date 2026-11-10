import type { OutputField, Param } from "@w6w/types";

/** Shared pieces of the two repository poll triggers (`new-repository`, `new-or-updated-repository`). */
export const WORKSPACE_ONLY_PARAM: Param = {
  key: "workspace",
  label: "Workspace",
  type: "string",
  required: true,
  hint: "The workspace slug (the first part of a repository URL).",
};

export const REPOSITORY_OUTPUT: OutputField[] = [
  { key: "uuid", type: "string", label: "Repository UUID" },
  { key: "full_name", type: "string", label: "Full name" },
  { key: "name", type: "string", label: "Name" },
  { key: "is_private", type: "boolean", label: "Private" },
  { key: "created_on", type: "string", label: "Created on" },
  { key: "updated_on", type: "string", label: "Updated on" },
];

export const REPOSITORY_SAMPLE = {
  type: "repository",
  uuid: "{2d3c4b5a-0000-4000-8000-0123456789ab}",
  full_name: "teamsinspace/documentation-tests",
  name: "documentation-tests",
  is_private: false,
  created_on: "2026-11-10T09:00:00.000000+00:00",
  updated_on: "2026-11-10T09:30:00.000000+00:00",
};

/** `{ workspace, … }` from a trigger's params; throws like the webhook triggers when it is empty. */
export function workspaceOf(params: { workspace?: string } | undefined): string {
  const w = params?.workspace?.trim();
  if (!w) throw new Error("Workspace is required to watch Bitbucket repositories.");
  return w;
}
