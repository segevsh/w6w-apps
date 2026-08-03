import type { ActionDefinition } from "@w6w/types";
import { JobberClient } from "../lib/client.ts";

/**
 * Which Jobber account is this Connection actually pointing at?
 *
 * Cheap, parameterless, and the thing to check first when a workflow is writing
 * to the wrong place. It is also what Jobber tells apps to store at connect
 * time so an `APP_DISCONNECT` webhook can be matched back to a Connection —
 * `auth/oauth2.ts` reads the same fields in `afterConnect`.
 *
 * `healthCheck: { kind: "credential" }` promotes this into the App's health
 * surface rather than duplicating it as a standalone check: a `read` action
 * with no required params IS the right liveness probe, and a host can invoke it
 * with `{}`. Severity defaults to `fatal` for this kind, which is correct — a
 * Connection that cannot name its own account cannot do anything else either.
 */
const QUERY = `
  query GetAccount {
    account {
      id
      name
      industry
      countryCode
      phone
      dedicatedPhoneNumber
      activeUserCount
      createdAt
    }
  }
`;

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Fetch the Jobber account this connection authorises — id, company name, industry, country and active user count.",
  params: [],
  output: [{ key: "account", type: "object", label: "The connected Jobber account" }],
  healthCheck: { kind: "credential" },

  execute(_input, ctx) {
    return new JobberClient(ctx).query(QUERY);
  },
};

export default accountGet;
