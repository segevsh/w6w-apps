import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import organizationList from "../actions/organization-list.ts";

// WorkOS: GET /organizations
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/organization/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<Record<string, never>>({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each newly created WorkOS organization (customer company).",
  action: organizationList as unknown as ActionDefinition,
  input: () => ({ order: "desc", limit: 50 }),
  items: (result) => (result as { organizations?: unknown[] }).organizations ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domains", type: "array", label: "Domains" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "org_01SAMPLE", name: "Acme", domains: [], created_at: "2026-11-09T10:00:00.000Z" },
  maxPages: 1,
});
