import type { HealthCheckDefinition } from "@w6w/types";
import { accountFromConnection, accountHost, describeError } from "../lib/client.ts";
import { API_VERSION } from "../lib/signing.ts";

/**
 * Is *this* storage account reachable, and is the key still signing for it?
 *
 * ## It has to be signed, and that is the point
 *
 * Almost every other connection-scoped check in this pack probes something
 * unauthenticated so a revoked credential does not read as an outage. Azure
 * gives no such endpoint: an unauthenticated request to a storage account is a
 * 400 or a 403 regardless of whether the account is healthy, so there is
 * nothing to learn from one.
 *
 * That means this check cannot separate "Azure is down" from "the key was
 * rotated" — and rather than implying otherwise, it says which of the two a
 * given failure looks like, using the pieces that do distinguish them:
 *
 * - **A name that does not resolve** is not an outage and not a credential
 *   problem. A storage account is a DNS name, so a deleted or renamed account
 *   fails to resolve, and this reports that separately.
 * - **`AuthenticationFailed`** is the key: rotated, or the clock has drifted
 *   more than the 15 minutes Azure allows.
 * - **A 5xx** is Azure.
 *
 * ## Clock drift presents as a permission problem
 *
 * Azure rejects a request whose `x-ms-date` is more than 15 minutes from its
 * own clock, with a 403. Nothing in the error mentions time. A host whose clock
 * has drifted therefore sees every request fail as though the credential were
 * wrong — so this check names it as a candidate whenever it sees that error.
 */
const check: HealthCheckDefinition = {
  key: "account",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  title: "Storage account reachable",
  description:
    "Lists containers with this connection's key. Azure offers no unauthenticated probe, so this " +
    "cannot fully separate an outage from a rotated key — it names which one a given failure " +
    "looks like, including CLOCK DRIFT, which Azure reports as a permission error.",
  covers: ["dependency", "credential"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["*.blob.core.windows.net"] },

  async check(_input, ctx) {
    let account: string;
    try {
      account = accountFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${accountHost(account)}/?comp=list&maxresults=1`, {
        headers: { "x-ms-version": API_VERSION },
      });
    } catch (err) {
      // A storage account is a DNS name — this is a deleted or renamed
      // account far more often than it is an outage.
      return {
        state: "down",
        message:
          `${accountHost(account)} did not resolve or could not be reached: ${
            String(err)
          }. A storage account is a DNS name, so this is usually an account that has been deleted ` +
          "or renamed rather than an Azure outage",
      };
    }
    const latencyMs = Date.now() - started;
    const body = await res.text().catch(() => "");
    const errorCode = res.headers.get("x-ms-error-code") ?? undefined;

    if (res.ok) {
      return {
        state: "ok",
        message: `the ${account} storage account answered`,
        latencyMs,
      };
    }

    if (errorCode === "AuthenticationFailed" || res.status === 403) {
      return {
        state: "down",
        message: `${describeError(res.status, body, errorCode)}. Two candidates: the account key ` +
          "has been rotated, or this host's clock has drifted more than the 15 minutes Azure " +
          "allows — the second presents as a permission error with nothing about time in it",
        latencyMs,
      };
    }
    if (res.status >= 500) {
      return {
        state: "down",
        message: `Azure Storage answered ${res.status} — this one is Azure, not the credential`,
        latencyMs,
      };
    }
    return {
      state: "degraded",
      message: describeError(res.status, body, errorCode),
      latencyMs,
    };
  },
};

export default check;
