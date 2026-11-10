import { pollFromListAction } from "../../_shared/poll/mod.ts";
import credentialSearch from "../actions/credential-search.ts";

export default pollFromListAction({
  key: "new-credential",
  title: "New Credential",
  description:
    "The run gets each newly created Certifier credential (sorted by createdAt, newest first).",
  action: credentialSearch,
  input: () => ({ sortProperty: "createdAt", sortOrder: "desc", limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "credential-1",
    status: "issued",
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z",
  },
  maxPages: 1,
});
