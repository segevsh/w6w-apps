import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { communityOutput } from "../lib/params.ts";

/**
 * `GET /community` — the community this token belongs to.
 *
 * There is no community *selector* anywhere in this App because there is
 * nothing to select: an Admin token is minted inside one community and
 * identifies it, so this endpoint takes no parameters and always answers about
 * the Connection's own community. It is Circle v2's closest thing to a whoami,
 * which is why `auth/api-token.ts` uses the same call for both `test` and the
 * connection label.
 *
 * ## Why this action is NOT tagged `healthCheck: { kind: "credential" }`
 *
 * It qualifies on every mechanical count — a `read`, no required params, side-
 * effect free — and the sibling `jobber` and `mailchimp` apps tag exactly this
 * kind of action. It is left untagged here for one reason: `auth/api-token.ts`'s
 * `test` hook already probes **this same endpoint**, and the host projects that
 * hook into the health surface automatically as `auth:api-token`. Tagging this
 * action too would spend two requests per health sweep to answer one question.
 *
 * On most vendors that is a rounding error. On Circle it is not: the Admin API
 * is metered at 5,000 requests/month on the Business plan, roughly seven an
 * hour, and health checks run on a schedule the community's owner does not
 * control. Duplicating the probe would quietly spend a measurable share of a
 * customer's allowance on redundancy. The derived `auth:api-token` check answers
 * the credential question — including the plan-entitlement 403 — at exactly the
 * same fidelity for half the cost.
 */
const communityGet: ActionDefinition<Record<string, never>> = {
  key: "community-get",
  type: "read",
  resource: "community",
  title: "Get Community",
  description:
    "Fetch the community this connection's token belongs to, with its settings. Takes no " +
    "parameters — the token identifies the community.",
  params: [],
  output: communityOutput,

  execute(_input, ctx) {
    return new CircleClient(ctx).request("/community");
  },
};

export default communityGet;
