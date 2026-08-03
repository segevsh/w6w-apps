import type { ActionDefinition } from "@w6w/types";
import { LemlistClient, PAGE_PARAMS, type PageInput, pageQuery } from "../lib/client.ts";

interface Input extends PageInput {}

/**
 * `GET /v2/unsubscribes/variables`.
 *
 * ## Why the `/v2/` path and not `GET /unsubscribes`
 *
 * The unprefixed `GET /unsubscribes` still exists, but lemlist marks it
 * `deprecated: true` in its OpenAPI document and prints a Warning on its page:
 * "This endpoint is **legacy**. Use [List Unsubscribed
 * Variables](/api-reference/endpoints/unsubscribes/list-unsubscribed-variables)
 * instead." The three legacy routes and their documented replacements
 * (all verified 2026-08-03):
 *
 *   | legacy (deprecated)          | replacement                              |
 *   | ---------------------------- | ---------------------------------------- |
 *   | `GET /unsubscribes`          | `GET /v2/unsubscribes/variables`         |
 *   | `POST /unsubscribes/{email}` | `POST /v2/unsubscribes/variables/{value}`|
 *   | `DELETE /unsubscribes/{email}`| `DELETE /v2/unsubscribes/variables/{value}` |
 *
 * This app ships the replacements throughout. Building on a route the vendor has
 * already flagged for removal would be shipping a known expiry date.
 *
 * ## "Variable", not "email"
 *
 * The v2 vocabulary is deliberately wider: an entry is any unsubscribed
 * *variable* — "emails, domains, LinkedIn URLs, phone numbers" — which is why
 * the field is `value` rather than `email`. `source` says where the opt-out came
 * from: `api`, `bounced`, `lead`, `user` or `abuse`.
 */
const listUnsubscribes: ActionDefinition<Input> = {
  key: "list-unsubscribes",
  type: "search",
  resource: "unsubscribe",
  title: "List Unsubscribes",
  description:
    "List the team's unsubscribed values — emails, domains, LinkedIn URLs and phone numbers — with the source of each opt-out.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { max: 100, integer: true },
      hint: "Entries per page. lemlist defaults to 100; maximum 100.",
    },
    ...PAGE_PARAMS.filter((p) => p.key !== "limit"),
  ],
  output: [{ key: "unsubscribes", type: "array", label: "Unsubscribed variables" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>("/v2/unsubscribes/variables", {
      query: pageQuery(input),
    });
  },
};

export default listUnsubscribes;
