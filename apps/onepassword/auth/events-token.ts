import type { AuthDefinition } from "@w6w/types";
import { describeError, EVENTS_HOSTS, eventsHostFor } from "../lib/client.ts";

/**
 * A 1Password Events Reporting token.
 *
 * ## A different credential for a different question
 *
 * This one reads **the audit trail** — who signed in, who changed what, and
 * which items were read by whom. It cannot read a single secret, cannot list a
 * vault, and cannot write anything. It is the credential you want pointed at a
 * SIEM, and the one that answers "who used that production database password
 * last Tuesday".
 *
 * It is deliberately a separate auth method from the Connect token rather than
 * two halves of one connection: they reach different services with different
 * blast radii, and a connection that held both would be a credential that can
 * read every secret *and* cover its tracks.
 *
 * ## The scope is per event kind
 *
 * A token is granted sign-in attempts, item usages and audit events
 * independently. A token without a given grant returns 403 on that endpoint
 * while working perfectly on the others, so a partial failure here is usually
 * scope rather than anything wrong.
 *
 * ## The region is part of the credential
 *
 * Four hosts, all verified live on 2026-08-18. An account in the EU or Canada
 * uses its own, and the wrong one answers `401 Unauthorized` — identical to a
 * bad token.
 */
const eventsToken: AuthDefinition = {
  key: "events-token",
  type: "bearer",
  displayName: "Events Reporting Token",
  description:
    "A token for the Events API — the account's audit trail. It can read who did what and who " +
    "opened which item, and it can read no secrets and write nothing.",
  connectionLabel: "1Password Events ({{region}})",
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "global",
      options: [
        { value: "global", label: "Global — events.1password.com" },
        { value: "eu", label: "Europe — events.1password.eu" },
        { value: "ca", label: "Canada — events.1password.ca" },
        { value: "enterprise", label: "Enterprise — events.ent.1password.com" },
      ],
      hint: "Whichever your account is on. The wrong host answers 401, exactly as a bad token " +
        "does.",
    },
    {
      key: "token",
      label: "Events Token",
      type: "secret",
      required: true,
      hint: "1Password account → Integrations → Events Reporting → create an integration. Grant " +
        "sign-in attempts, item usages and audit events separately — a missing grant is a 403 on " +
        "that endpoint alone.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/auth/introspect` — reports the token's own scope, which is
   * exactly what somebody setting this up needs to see.
   */
  async test({ credential }, ctx) {
    const { region, token } = credential as { region?: string; token?: string };
    if (!token) return { ok: false, message: "credential missing the Events token" };

    let host: string;
    try {
      host = eventsHostFor(region);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/api/auth/introspect`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      const others = Object.keys(EVENTS_HOSTS).filter((key) => key !== (region ?? "global"));
      return {
        ok: false,
        message: `${describeError(res.status, text, "events")}. If the token is definitely ` +
          `right, try another region — ${others.join(", ")} are separate hosts`,
      };
    }

    const body = JSON.parse(text) as { Features?: string[]; UUID?: string; IssuedAt?: string };
    const features = body?.Features ?? [];
    return {
      ok: true,
      message: features.length > 0
        ? `connected — this token is granted: ${features.join(", ")}`
        : "connected, but the token is granted no event kinds, so every endpoint will 403",
    };
  },

  async afterConnect({ credential }, ctx) {
    const { region, token } = credential as { region?: string; token?: string };
    const normalised = String(region ?? "global").toLowerCase();
    if (!token) return { surface: "events", region: normalised };
    let host: string;
    try {
      host = eventsHostFor(region);
    } catch {
      return { surface: "events", region: normalised };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/api/auth/introspect`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch {
      return { surface: "events", region: normalised };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { surface: "events", region: normalised };
    }

    const body = await res.json().catch(() => null) as { Features?: string[] } | null;
    return {
      surface: "events",
      region: normalised,
      // What the token may actually read, so the actions' 403s make sense.
      features: body?.Features ?? [],
    };
  },
};

export default eventsToken;
