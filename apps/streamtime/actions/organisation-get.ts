import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `GET /organisation` — the organisation the credential belongs to.
 *
 * The same call `auth/api-token.ts` probes with, exposed as an Action because
 * it is also the cheapest way to discover the defaults every other call leans
 * on: the organisation's currency and country. Note that it carries **no
 * organisation id** — the token *is* the tenant.
 */
const organisationGet: ActionDefinition<Record<string, never>> = {
  key: "organisation-get",
  type: "read",
  resource: "organisation",
  title: "Get Organisation",
  description:
    "Fetch the organisation this connection's bearer token belongs to — its name, domain, " +
    "default currency and address.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Organisation name" },
    { key: "domain", type: "string", label: "Streamtime domain" },
    {
      key: "currency",
      type: "object",
      label: "Default customer currency — `{ id, name, symbol }`",
    },
    { key: "address", type: "string", label: "Address of the default branch" },
    { key: "country", type: "object", label: "Country — `{ id, name }`" },
  ],

  execute(_input, ctx) {
    return new StreamtimeClient(ctx).request("/organisation");
  },
};

export default organisationGet;
