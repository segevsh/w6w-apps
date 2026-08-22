import type { ActionDefinition } from "@w6w/types";
import { json, NewRelicClient } from "../lib/client.ts";

/**
 * Send an arbitrary NerdGraph query — the escape hatch.
 *
 * NerdGraph is one schema covering everything New Relic does, and it is far
 * larger than any set of actions can wrap. Rather than leave the rest
 * unreachable, this exposes the endpoint directly.
 *
 * ## It is not a way around the error handling
 *
 * A raw query goes through the same client, so all three error levels are
 * still checked: the HTTP status, the GraphQL `errors` array inside a 200, and
 * partial successes where `data` and `errors` both arrive. What it does not do
 * is check a *mutation's* own `errors` payload — the shape of that is
 * per-mutation, so a raw mutation should ask for `errors { message type }` and
 * the caller should read them.
 *
 * ## Prefer the wrapped actions where they exist
 *
 * They carry the knowledge this one cannot: that NRQL defaults to an hour and
 * a hundred rows, that a deployment timestamp must be within a day, that a
 * mutation reports its failures inside `data`. A raw query is the right tool
 * for the parts of the schema nothing here covers, and the wrong one for the
 * parts it does.
 */
const action: ActionDefinition = {
  key: "graphql-query",
  type: "search",
  resource: "graphql",
  title: "Run a NerdGraph query",
  description:
    "Send an arbitrary GraphQL query or mutation. The HTTP and GraphQL error levels are still " +
    "checked; a raw MUTATION should request `errors { message type }` and read them itself.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "text",
      required: true,
      default: "",
      placeholder: "{ actor { user { name } } }",
      hint: "GraphQL. Use `$variables` and the field below rather than interpolating strings.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      default: "",
      hint: "A JSON object. Safer than building the query by concatenation.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The `data` field, unwrapped" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");

    const variables = (json(p.variables, "variables") ?? {}) as Record<string, unknown>;
    const data = await new NewRelicClient(ctx).gql<Record<string, unknown>>(query, variables);

    // The query is the caller's; only its shape is logged.
    ctx.log("info", "ran a NerdGraph query", {
      isMutation: /^\s*mutation\b/.test(query),
      variableCount: Object.keys(variables).length,
    });

    return { data };
  },
};

export default action;
