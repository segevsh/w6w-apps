/**
 * Is **this connection's** EasyPost account working, and is it the environment
 * you think?
 *
 * The failure this exists for is not an outage. It is a **test key doing
 * production work** — which succeeds at every call, returns plausible rates,
 * and produces labels that are not postage. Nothing in a shipment's response
 * says which kind of key made it, and a credential check cannot see it either,
 * because the credential is perfectly valid.
 *
 * So this reads `GET /v2/users`, reports the mode, and treats a `test` key as
 * **`degraded`** rather than `ok`. That is a deliberate choice and not a
 * complaint about test keys: it is right for a connection that exists to
 * develop against, and it is exactly the warning somebody wants on the
 * connection that ships real orders. An unlabelled state is reported as
 * `unknown` rather than assumed either way.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, BASE_URL } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account and environment",
  description:
    "Whether this connection's account answers, and whether its key is test or production — a " +
    "test key succeeds at everything and buys nothing, which no credential check can see.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/users`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach EasyPost: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // The derived auth check owns credential failures.
      return { state: "unknown", message: "the API key was rejected or deactivated" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `EasyPost answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { name?: string; balance?: string; api_keys?: Array<{ mode?: string }> }
      | null;
    const modes = new Set(
      (body?.api_keys ?? []).map((k) => String(k?.mode ?? "")).filter(Boolean),
    );
    const name = body?.name ?? "the account";

    if (modes.size === 1 && [...modes][0] === "test") {
      return {
        state: "degraded",
        message:
          `${name} answers, but this is a TEST key — every rate and label it produces is a ` +
          "simulation, and nothing is ever purchased",
      };
    }
    if (modes.size !== 1) {
      return {
        state: "unknown",
        message: `${name} answers, but EasyPost did not state whether this key is test or ` +
          "production",
      };
    }
    return {
      state: "ok",
      message: body?.balance
        ? `${name} (production), balance ${body.balance}`
        : `${name} (production)`,
      ttlSeconds: 600,
    };
  },
};

export default account;
