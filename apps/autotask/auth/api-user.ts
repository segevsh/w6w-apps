import type { AuthDefinition } from "@w6w/types";
import {
  API_PATH,
  describeError,
  DISCOVERY_HOST,
  zoneBase,
  zoneHost,
  zoneOf,
  ZONES,
} from "../lib/client.ts";

/**
 * An Autotask API-only user: username, secret and the integration tracking identifier.
 *
 * ## Three values, three headers
 *
 * Every request carries `UserName`, `Secret` and `ApiIntegrationCode`. The user must have the
 * "API User (API-only)" security level; an ordinary UI user is refused. The integration code is the
 * tracking identifier on that user's Security tab (a vendor identifier, or a "Custom (Internal
 * Integration)" one for the customer's own use). `sign` is the only hook that reads any of them.
 *
 * ## The zone is a connection field, and `test` double-checks it
 *
 * The tenant's data is on one numbered zone. `GET /zoneInformation?user=` on the un-numbered host
 * answers which, for any username and with no credential, so `test` asks it and names the right
 * zone when the connection picked another one. Measured live: an unknown username answers
 * `500 {"errors":["Zone information could not be determined"]}`.
 *
 * ## The credential probe is `GET /Version`
 *
 * It needs the three headers, no entity permission and returns only the platform version
 * (`majorVersion`, `minorVersion`, `build`, `customerType`), never the credential. Autotask
 * answers every credential failure with an empty `401`, so a failed probe cannot say which of the
 * three values is wrong and the message lists them all.
 */

export interface AutotaskCredential {
  username: string;
  secret: string;
  integrationCode: string;
  zone: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<AutotaskCredential>): Record<string, string> {
  return {
    UserName: (credential.username ?? "").trim(),
    Secret: (credential.secret ?? "").trim(),
    ApiIntegrationCode: (credential.integrationCode ?? "").trim(),
  };
}

const apiUser: AuthDefinition = {
  key: "api-user",
  type: "custom",
  displayName: "API User",
  description: "An Autotask API-only user's username, secret and integration tracking " +
    "identifier, plus the zone the account lives on.",
  connectionLabel: "Autotask PSA (zone {{zone}})",
  fields: [
    {
      key: "username",
      label: "API username",
      type: "string",
      required: true,
      hint: "The API user's username (an email-style login). The user needs the 'API User " +
        "(API-only)' security level.",
    },
    {
      key: "secret",
      label: "API secret",
      type: "secret",
      required: true,
      hint: "The API user's password/secret, set on its Resource record in Autotask.",
    },
    {
      key: "integrationCode",
      label: "API tracking identifier",
      type: "secret",
      required: true,
      hint: "Resource > Security tab > API Tracking Identifier. Pick an Integration Vendor, or " +
        "'Custom (Internal Integration)' for your own use.",
    },
    {
      key: "zone",
      label: "Zone",
      type: "select",
      required: true,
      default: "2",
      options: ZONES.map((zone) => ({
        value: String(zone),
        label: `Zone ${zone} — ${zoneHost(String(zone))}`,
      })),
      hint:
        "The number in your Autotask web address (webservices{N}.autotask.net). A call to the wrong " +
        "zone is refused, and the connection test tells you the right one.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the three headers. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<AutotaskCredential>))
    ) {
      request.headers[name] = value;
    }
    if (!request.headers["content-type"] && !request.headers["Content-Type"] && request.body) {
      request.headers["content-type"] = "application/json";
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AutotaskCredential>;
    const headers = authHeaders(cred);
    if (!headers.UserName) return { ok: false, message: "credential missing the API username" };
    if (!headers.Secret) return { ok: false, message: "credential missing the API secret" };
    if (!headers.ApiIntegrationCode) {
      return { ok: false, message: "credential missing the API tracking identifier" };
    }
    const zone = zoneOf(cred.zone);
    if (!zone) {
      return {
        ok: false,
        message: `zone "${cred.zone ?? ""}" is not a published Autotask zone (${ZONES.join(", ")})`,
      };
    }

    // Step 1 — unsigned zone discovery; a mismatch is the commonest setup mistake.
    try {
      const res = await ctx.fetch(
        `https://${DISCOVERY_HOST}${API_PATH}/zoneInformation?user=${
          encodeURIComponent(headers.UserName)
        }`,
        { headers: { accept: "application/json" } },
      );
      const text = await res.text().catch(() => "");
      if (res.ok) {
        const info = JSON.parse(text) as { url?: string; zoneName?: string };
        const actual = zoneOf(new URL(info.url ?? "").hostname);
        if (actual && actual !== zone) {
          return {
            ok: false,
            message: `this username lives on zone ${actual} (${info.zoneName ?? "unnamed"}), ` +
              `not zone ${zone} — reconnect with zone ${actual}`,
          };
        }
      } else if (/zone information could not be determined/i.test(text)) {
        return {
          ok: false,
          message: "Autotask does not recognise this username (zone lookup failed) — check it " +
            "is the API user's login, spelled exactly",
        };
      }
    } catch { /* discovery is advisory; the real probe below decides */ }

    // Step 2 — the credential probe. `sign` only applies to action traffic, so headers are by hand.
    let res: Response;
    try {
      res = await ctx.fetch(`${zoneBase(zone)}/Version`, {
        headers: { accept: "application/json", ...headers },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${zoneHost(zone)}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let version: { majorVersion?: string; minorVersion?: string; build?: string };
    try {
      version = JSON.parse(text);
    } catch {
      return { ok: false, message: "Autotask did not return a JSON version document" };
    }
    if (!version?.majorVersion) {
      return { ok: false, message: "Autotask's version response had no majorVersion" };
    }
    return {
      ok: true,
      message: `connected to zone ${zone} (API ${version.majorVersion}.${
        version.minorVersion ?? "0"
      })`,
    };
  },

  afterConnect({ credential }) {
    const cred = credential as Partial<AutotaskCredential>;
    return { zone: zoneOf(cred.zone) ?? "" };
  },
};

export default apiUser;
