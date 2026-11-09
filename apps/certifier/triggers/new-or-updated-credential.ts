import { pollFromListAction } from "../../_shared/poll/mod.ts";
import credentialSearch from "../actions/credential-search.ts";

export default pollFromListAction({
  key: "new-or-updated-credential",
  title: "New or Updated Credential",
  description:
    "The run gets each Certifier credential that is created or changed (sorted by updatedAt, newest first).",
  action: credentialSearch,
  input: () => ({ sortProperty: "updatedAt", sortOrder: "desc", limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => {
    const c = v as { id?: unknown; updatedAt?: unknown };
    return `${c.id}:${c.updatedAt}`;
  },
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "credential-1",
    status: "revoked",
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T11:00:00.000Z",
  },
  maxPages: 1,
});
