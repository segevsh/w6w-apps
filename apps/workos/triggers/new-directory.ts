import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import directoryList from "../actions/directory-list.ts";

// WorkOS: GET /directories
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/directory-sync/directory/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ organizationId?: string }>({
  key: "new-directory",
  title: "New Directory",
  description: "The run gets each newly connected SCIM directory, optionally for one organization.",
  action: directoryList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ organizationId, order: "desc", limit: 50 }),
  items: (result) => (result as { directories?: unknown[] }).directories ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  output: [
    { key: "id", type: "string", label: "Directory ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "state", type: "string", label: "State" },
    { key: "organization_id", type: "string", label: "Organization ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "directory_01SAMPLE",
    name: "Acme directory",
    type: "okta scim v2.0",
    state: "linked",
    organization_id: "org_01SAMPLE",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
