import { pollFromListAction } from "../../_shared/poll/mod.ts";
import credentialSearch from "../actions/credential-search.ts";
export default pollFromListAction({
  key: "new-credential",
  title: "New Credential",
  description: "The run gets each newly created credential.",
  action: credentialSearch,
  input: () => ({ sortProperty: "createdAt", sortOrder: "desc", limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Credential ID" }],
  sample: { id: "credential-1" },
  maxPages: 1,
});
