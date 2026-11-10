import { snapshotTrigger } from "../lib/snapshot.ts";
import domainList from "../actions/domain-list.ts";

/**
 * `GET /v5/domains` (https://vercel.com/docs/rest-api/domains/list-all-the-domains, 2026-11-10):
 * the domains a team owns are a small bounded collection, so each check reads the whole list
 * (`returnAll`) and diffs the domain ids against the previous one.
 */
export default snapshotTrigger({
  key: "new-domain",
  title: "New Domain",
  description: "The run gets each domain that newly appears in the team or account.",
  action: domainList as never,
  input: () => ({ returnAll: true }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Domain ID" },
    { key: "name", type: "string", label: "Domain" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "createdAt", type: "number", label: "Created (ms)" },
  ],
  sample: {
    id: "dom_6Hs1qWk3Pz9XfYb2",
    name: "example.com",
    verified: true,
    createdAt: 1794700800000,
  },
});
