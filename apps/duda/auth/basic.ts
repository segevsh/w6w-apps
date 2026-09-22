import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, baseUrl, regionOf, USER_AGENT } from "../lib/client.ts";

/**
 * Duda API user + password, as HTTP Basic.
 *
 * Duda's getting-started guide ("Authentication & Security") is explicit: the
 * Partner API authenticates with HTTP Basic, and the user name and password
 * issued for the account are "joined with a colon and base64 encoded before
 * passing it into the `Authorization` header". The account's credentials come
 * from the Business tools tab's Service API Account, or from Duda support when
 * API access is granted.
 *
 * The OpenAPI fragments also list a `token` bearer scheme fed by a separate
 * "Temporary Token" admin flow. That is not the partner-facing mechanism the
 * getting-started guide documents, so only Basic is implemented here.
 *
 * ## The probe is the documented site list, judged by its shape
 *
 * `GET /api/sites/multiscreen?limit=1` is the cheapest read with no side
 * effects and no scope beyond the basic read access every issued credential
 * has. It is classified by the **documented success shape** — the
 * `PaginationResultRDT…` envelope's `results` array plus a numeric
 * `total_responses` — rather than by `res.ok` alone.
 *
 * That is necessary here, not merely tidy: measured live on 2026-09-22, Duda
 * answers 401 with a **completely empty body** (`content-length: 0`, only a
 * `WWW-Authenticate: Basic realm="DM API"` header) on both regional hosts and
 * on every path tried — the `ErrorRDT` JSON the docs show for 401 is not what
 * the service actually sends. There is therefore no vendor error code to read
 * on failure, and no credential material is echoed back in either direction.
 * The README records this under "Notes on the API".
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API User & Password",
  description:
    "The API user name and password Duda issues for your account — sent as HTTP Basic. Get them " +
    "from the Business tools tab (Service API Account) or your Duda contact.",
  connectionLabel: "Duda ({{region}})",
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "US",
      options: [
        { value: "US", label: "US — api.duda.co" },
        { value: "EU", label: "EU — api.eu.duda.co" },
      ],
      hint: "Duda accounts are provisioned in one region; ask your Duda contact if unsure — US " +
        "is the default for most accounts.",
    },
    {
      key: "apiUser",
      label: "API User",
      type: "string",
      required: true,
      row: "creds",
      hint: "The API user name issued for the account — it is not the address you log in with.",
    },
    {
      key: "apiPassword",
      label: "API Password",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The password issued with that user name. Both come from the Business tools tab's " +
        "Service API Account.",
    },
  ],

  /** The only hook that sees the credential. The URL never carries it. */
  sign({ request, credential }) {
    const { apiUser, apiPassword } = credential as { apiUser: string; apiPassword: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiUser}:${apiPassword}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { region, apiUser, apiPassword } = credential as {
      region?: string;
      apiUser?: string;
      apiPassword?: string;
    };
    if (!apiUser || !apiPassword) {
      return { ok: false, message: "credential missing the API user or password" };
    }

    const resolved = regionOf(region);
    // `sign` is not applied to a standalone auth hook, so the header is set here.
    let res: Response;
    try {
      res = await ctx.fetch(
        `${baseUrl(resolved)}${API_PREFIX}/sites/multiscreen?limit=1`,
        {
          headers: {
            authorization: `Basic ${btoa(`${apiUser}:${apiPassword}`)}`,
            accept: "application/json",
            "user-agent": USER_AGENT,
          },
        },
      );
    } catch (err) {
      return { ok: false, message: `could not reach ${baseUrl(resolved)}: ${String(err)}` };
    }

    // 401 arrives with an empty body, so the status is all there is to go on —
    // and the credential itself is never echoed into the message.
    if (!res.ok) {
      return { ok: false, message: `Duda rejected the credential (HTTP ${res.status})` };
    }

    const body = await res.json().catch(() => null) as
      | { results?: unknown; total_responses?: unknown }
      | null;
    const shaped = Array.isArray(body?.results) && typeof body?.total_responses === "number";
    if (!shaped) {
      return {
        ok: false,
        message: "Duda answered 200 but not with the documented paginated site list — check that " +
          "this host is really the Partner API",
      };
    }

    return {
      ok: true,
      message: `connected to the ${resolved} region — ${
        String(body!.total_responses)
      } site(s) on this account`,
    };
  },

  /**
   * Records the region on the connection. Deliberately no network call: `test`
   * has just proven the credential, and the region is what every Action needs
   * from here on.
   */
  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: regionOf(region) };
  },
};

export default basic;
