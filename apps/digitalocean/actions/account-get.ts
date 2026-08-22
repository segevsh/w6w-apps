import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient } from "../lib/client.ts";

/**
 * `GET /v2/account` — who this token is, and what the account may create.
 *
 * ## The limits are the interesting part
 *
 * `droplet_limit`, `volume_limit` and `reserved_ip_limit` are per-account caps.
 * Hitting one is a **422** on creation — the request was understood and
 * refused — which reads as a bad size or region rather than as a quota. New
 * accounts start with a low droplet limit, and it is raised on request rather
 * than automatically.
 *
 * So a workflow that provisions is worth pointing at this first: the limit is
 * knowable in advance and the failure is not self-explaining.
 *
 * ## `status` gates everything else
 *
 * An account that is not `active` — locked for billing, or under review —
 * authenticates normally and refuses every operation on resources. The token
 * looks fine, because it is.
 */
const action: ActionDefinition = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get the account",
  description:
    "The account behind this token and its resource LIMITS. Hitting a limit is a 422 on " +
    "creation, which reads as a bad size or region rather than as a quota — and this is where " +
    "the number is knowable in advance.",
  params: [],
  output: [
    { key: "account", type: "object", label: "The account" },
    { key: "email", type: "string", label: "Its email" },
    { key: "status", type: "string", label: "Anything but `active` refuses every operation" },
    { key: "dropletLimit", type: "number", label: "How many droplets it may have at once" },
    { key: "volumeLimit", type: "number", label: "How many volumes" },
    { key: "reservedIpLimit", type: "number", label: "How many reserved IPs" },
    { key: "emailVerified", type: "boolean", label: "An unverified account cannot create much" },
  ],

  async execute(_input, ctx) {
    const body = await new DigitalOceanClient(ctx).request<{
      account?: {
        email?: string;
        status?: string;
        droplet_limit?: number;
        volume_limit?: number;
        reserved_ip_limit?: number;
        email_verified?: boolean;
      };
    }>("/v2/account");

    const account = body?.account;
    if (account?.status && account.status !== "active") {
      ctx.log(
        "warn",
        "this DigitalOcean account is not active — the token authenticates and every operation " +
          "on resources will be refused",
        { status: account.status },
      );
    }

    return {
      account,
      email: account?.email,
      status: account?.status,
      dropletLimit: account?.droplet_limit,
      volumeLimit: account?.volume_limit,
      reservedIpLimit: account?.reserved_ip_limit,
      emailVerified: account?.email_verified === true,
    };
  },
};

export default action;
