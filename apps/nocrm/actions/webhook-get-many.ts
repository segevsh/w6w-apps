import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/** No input: the List-the-webhooks section documents no parameters. */
type Input = Record<string, never>;

/**
 * `GET /api/v2/webhooks` — list the account's webhooks and notifications.
 *
 * The List-the-webhooks section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents no parameters. Its
 * sample response carries `event`, `target`, `target_type`, `name` and
 * `is_disabled` — the last of which is how a caller tells a paused webhook from
 * a live one, since the document offers no enable/disable endpoint inside the
 * reviewed surface.
 *
 * Its 401 table names `not_api_key` alongside the usual `unauthorized_*` types,
 * and `create-a-webhook` names the same one — the webhook endpoints are
 * documented as API-key surfaces.
 */
const webhookGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "webhook-get-many",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the webhooks and notifications subscribed in the account (GET /api/v2/webhooks).",
  params: [],
  output: listOutput("Webhooks"),

  execute(_input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/webhooks`);
  },
};

export default webhookGetMany;
