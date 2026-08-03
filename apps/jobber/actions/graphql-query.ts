import type { ActionDefinition } from "@w6w/types";
import { JobberClient, jsonArg } from "../lib/client.ts";

interface Input {
  query: string;
  variables?: unknown;
}

/**
 * The escape hatch.
 *
 * Jobber's schema has ~3,650 types. The twenty-odd actions in this app cover
 * clients, properties, requests, quotes, jobs, visits, invoices and the price
 * book — the field-service spine — and that is a small fraction of the surface:
 * timesheets, expenses, job costing, payouts, custom fields, job forms, tags,
 * payment records, capital loans and the whole Jobber Payments subsystem are
 * all reachable and none of them are modelled here. Enumerating them in a
 * manifest would be a losing race against a schema that ships breaking changes
 * on a dated cadence.
 *
 * So this action exists for the same reason `apps/odoo` ships `call-method`:
 * an API whose surface is genuinely open-ended needs one door that does not
 * pretend otherwise.
 *
 * It carries the same guarantees as every other action here and no fewer:
 *
 *   - it goes through `ctx.fetch`, so the egress allowlist applies;
 *   - it never sees the credential — the runtime's `sign` hook attaches it;
 *   - the API version header is stamped by the client, so a hand-written query
 *     is pinned to the same schema version as everything else;
 *   - HTTP 200 with `errors[]` still throws.
 *
 * What it does NOT do is check `userErrors`. It cannot: `unwrap` needs to know
 * which field of `data` is the mutation payload, and only the caller knows
 * that. **A mutation written here must select `userErrors { message path }`
 * and the workflow must check it** — otherwise a rejected write returns a
 * perfectly successful-looking result with a null record. This is the one place
 * in the app where that burden moves to the author, and it is why the
 * `extensions` envelope is returned alongside `data`: the cost meter and any
 * version warning come back with it.
 */
const RESULT_SHAPE = `{ "data": { ... }, "extensions": { "cost": { ... } } }`;

const graphqlQuery: ActionDefinition<Input> = {
  key: "graphql-query",
  type: "perform",
  resource: "raw",
  title: "Run GraphQL Query",
  description:
    "Send an arbitrary query or mutation to Jobber's GraphQL API, pinned to this app's API version. Returns `data` and `extensions`. Mutations must select and check `userErrors` themselves.",
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Query or mutation",
      type: "code",
      ui: "code:graphql",
      required: true,
      placeholder: "query ($first: Int) { clients(first: $first) { nodes { id name } } }",
      hint:
        "Always bound connections with `first` or `last` — an unbounded connection is priced as if it returned 100 nodes.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "A JSON object matching the query's variable definitions.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The GraphQL data payload" },
    {
      key: "extensions",
      type: "object",
      label: `Jobber's envelope — query cost and any version warning. Shape: ${RESULT_SHAPE}`,
    },
  ],

  async execute(input, ctx) {
    const payload = await new JobberClient(ctx).send(
      input.query,
      jsonArg(input.variables, "variables") ?? {},
    );
    return { data: payload.data, extensions: payload.extensions };
  },
};

export default graphqlQuery;
