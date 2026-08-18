import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/clients` — the tenant's applications.
 *
 * Every application that can ask Auth0 for a token: the single-page app, the
 * mobile client, the machine-to-machine credential this very connection uses.
 *
 * **`client_secret` is deliberately not requested.** Auth0 returns it on this
 * endpoint when the token has the scope for it, and an application's secret is
 * the one thing a workflow has no business collecting into a log or a variable.
 * This action asks for a field list that excludes it, so the secret is never in
 * the response at all — a narrower promise than trusting nobody to print it.
 *
 * `app_type` distinguishes what the application is (`spa`, `native`,
 * `non_interactive`, `regular_web`), which determines which grants it may use
 * and is the usual reason a flow is refused.
 */
const action: ActionDefinition = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List applications",
  description:
    "The tenant's applications and their types. Client secrets are deliberately excluded from " +
    "the request, not just from the output.",
  params: [
    {
      key: "appType",
      label: "Application Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "spa", label: "Single-page application" },
        { value: "native", label: "Native" },
        { value: "regular_web", label: "Regular web application" },
        { value: "non_interactive", label: "Machine to machine" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "clients", type: "array", label: "Applications" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const { items, total } = await new Auth0Client(ctx).requestAll("/clients", "clients", {
      query: {
        app_type: String(p.appType ?? "") || undefined,
        // An explicit allow-list of fields, so `client_secret` is never even
        // sent by Auth0.
        fields: "client_id,name,description,app_type,callbacks,grant_types,is_first_party,logo_uri",
        include_fields: true,
      },
    }, returnAll ? Infinity : limit);
    return { clients: items, total };
  },
};

export default action;
