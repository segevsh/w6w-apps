import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

type Output = Array<{
  id: number;
  name: string;
  domain: string | null;
  access?: string;
  owner?: { id?: number; name?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}>;

/**
 * `GET /orgs` — "This enumerates all the team sites or personal areas
 * available."
 *
 * The top of the hierarchy, and the only listing endpoint that needs no id at
 * all: org → workspace → doc → table → column → record.
 *
 * Two things to know about the response:
 *
 *  - It is a **bare JSON array**, not `{ orgs: [...] }`. That is why this action
 *    declares an array output rather than an envelope.
 *  - `domain` is the string form used as an `orgId` everywhere else
 *    (`gristlabs`), and it is `null` for a personal area. The numeric `id`
 *    always works, which is why `list-workspaces` accepts either.
 *
 * A personal-site connection normally sees exactly one org here — the personal
 * area. That is not a bug, it is what `docs.getgrist.com` is.
 */
const listOrgs: ActionDefinition<Record<string, never>, Output> = {
  key: "list-orgs",
  type: "read",
  resource: "org",
  title: "List Organizations",
  description:
    "List the team sites and personal areas this connection can reach. Takes no parameters.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Numeric org ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Subdomain (null for a personal area)" },
    { key: "access", type: "string", label: "Your access level" },
  ],

  execute(_input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>("/orgs");
  },
};

export default listOrgs;
