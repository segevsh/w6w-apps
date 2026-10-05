import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeRegion, type Region, REGIONS } from "../lib/client.ts";

/**
 * A Plaud partner application's credentials from the developer portal
 * (portal.plaud.ai), plus the end user the connection acts as.
 *
 * ## Which credential reaches which endpoint
 *
 * | Endpoint family                         | Sent as                                         |
 * | --------------------------------------- | ----------------------------------------------- |
 * | `/oauth/partner/access-token`           | `Authorization: Basic base64(client_id:secret)` |
 * | `/open/partner/users/access-token`      | `Authorization: Bearer <partner token>`         |
 * | `/open/partner/sdk/*` (device binding)  | `Authorization: Bearer <user token>`            |
 * | `/open/partner/files/upload/*`          | `Authorization: Bearer <user token>`            |
 * | `/open/partner/ai/transcriptions/*`     | `X-Client-Id` + `X-Client-Api-Key` headers      |
 *
 * The first two steps happen here, in `exchange`/`refresh` (which may use the network);
 * only the resulting 24-hour **user token** is stored, plus the keys `sign` needs. The
 * partner token is never stored. `sign` picks the style from the request path.
 *
 * ## The transcription `api_key` is a third secret
 *
 * Plaud's docs say outright that it is NOT the `secret_key`: it comes from the portal's
 * App Settings > API Keys. It is optional here, so a connection that only binds devices
 * or uploads files does not need it; a transcription call without it fails in `sign`.
 *
 * ## Errors are classified from the body
 *
 * A wrong `client_id` answers 401 `{"detail":"CLIENT_NOT_FOUND"}` (measured live on the US and
 * Japan hosts). The body's own `detail` is what the message carries.
 */
const USER_TOKEN_SECONDS = 86400;

const auth: AuthDefinition = {
  key: "credentials",
  type: "custom",
  displayName: "Partner app credentials",
  connectionLabel: "{{regionLabel}} — {{userId}}",
  description:
    "Your Plaud developer app's client id and secret key (portal.plaud.ai), the stable id of the " +
    "end user this connection acts as, and — only for transcription — the app's API key from " +
    "App Settings > API Keys.",
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "US (platform-us.plaud.ai)" },
        { value: "jp", label: "Japan (platform-jp.plaud.ai)" },
      ],
      hint: "Where your Plaud app is hosted. US is the default; Japan is a sales-enabled option. " +
        "Europe and Singapore are listed by Plaud as sales-gated but their hosts do not resolve yet.",
    },
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "secretKey", label: "Secret key", type: "secret", required: true },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "Your own stable identifier for the end user this connection acts as (6 to 120 " +
        "characters). Device bindings and uploads belong to this user.",
      validation: { minLength: 6, maxLength: 120 },
    },
    {
      key: "apiKey",
      label: "API key (transcription only)",
      type: "secret",
      hint: "From the portal's App Settings > API Keys. NOT the secret key. Needed only for the " +
        "transcription actions.",
    },
  ],

  async exchange({ fields }, ctx) {
    const v = fields as Record<string, unknown>;
    const region = normalizeRegion(v?.region);
    const clientId = String(v?.clientId ?? "").trim();
    const secretKey = String(v?.secretKey ?? "").trim();
    const userId = String(v?.userId ?? "").trim();
    const apiKey = String(v?.apiKey ?? "").trim();
    if (!clientId || !secretKey) throw new Error("`clientId` and `secretKey` are both required");
    if (userId.length < 6 || userId.length > 120) {
      throw new Error("`userId` must be 6 to 120 characters (Plaud's documented limit)");
    }
    const token = await mintUserToken(region, clientId, secretKey, userId, ctx.fetch);
    return { region, clientId, secretKey, userId, apiKey, ...token };
  },

  async refresh({ credential }, ctx) {
    const c = credential as Record<string, unknown>;
    const token = await mintUserToken(
      normalizeRegion(c?.region),
      String(c?.clientId ?? ""),
      String(c?.secretKey ?? ""),
      String(c?.userId ?? ""),
      ctx.fetch,
    );
    return { ...c, ...token };
  },

  // The only code handed the credential. Network-less: stamp and return.
  sign({ request, credential }) {
    const c = credential as Record<string, unknown>;
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return request;
    }
    // Never stamp a request to a host that is not Plaud's own.
    if (!/^platform-[a-z]+\.plaud\.ai$/.test(url.hostname)) return request;

    if (url.pathname.includes("/open/partner/ai/transcriptions")) {
      const apiKey = String(c?.apiKey ?? "");
      if (!apiKey) {
        throw new Error(
          "This connection has no transcription API key. Add the app's API key (portal > App " +
            "Settings > API Keys — not the secret key) to the connection to use transcription",
        );
      }
      return {
        ...request,
        headers: {
          ...request.headers,
          "x-client-id": String(c?.clientId ?? ""),
          "x-client-api-key": apiKey,
        },
      };
    }
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${String(c?.userToken ?? "")}` },
    };
  },

  async test({ credential }, ctx) {
    const c = credential as Record<string, unknown>;
    const region = normalizeRegion(c?.region);
    try {
      // Re-prove the client id and secret by minting a partner token and discarding it.
      await partnerToken(
        region,
        String(c?.clientId ?? ""),
        String(c?.secretKey ?? ""),
        ctx.fetch,
      );
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
    return {
      ok: true,
      message: `app credentials accepted by ${REGIONS[region].host}` +
        (c?.apiKey ? "" : " (no transcription API key set)"),
    };
  },

  afterConnect({ credential }) {
    const c = credential as Record<string, unknown>;
    const region: Region = normalizeRegion(c?.region);
    return {
      region,
      regionLabel: REGIONS[region].label,
      userId: String(c?.userId ?? ""),
      transcription: c?.apiKey ? "enabled" : "no API key",
    };
  },
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

async function readJson(res: Response, what: string): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch { /* handled below */ }
  // Classify from the body's own detail/message; the status is only a hint.
  if (!res.ok || body.detail !== undefined) {
    throw new Error(
      `Plaud refused the ${what} request (${res.status}: ${describeError(res.status, text)})`,
    );
  }
  if (!body.access_token) throw new Error(`Plaud returned no \`access_token\` for the ${what}`);
  return body;
}

/** `POST /oauth/partner/access-token`, HTTP Basic, form content type and no body. */
async function partnerToken(
  region: Region,
  clientId: string,
  secretKey: string,
  fetchImpl: Fetch,
): Promise<string> {
  const res = await fetchImpl(`${REGIONS[region].base}/oauth/partner/access-token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      authorization: `Basic ${btoa(`${clientId}:${secretKey}`)}`,
    },
    body: "",
  });
  return String((await readJson(res, "partner token")).access_token);
}

/** Partner token, then `POST /open/partner/users/access-token` for the per-user token. */
async function mintUserToken(
  region: Region,
  clientId: string,
  secretKey: string,
  userId: string,
  fetchImpl: Fetch,
): Promise<{ userToken: string; userTokenExpiresAt: string }> {
  const partner = await partnerToken(region, clientId, secretKey, fetchImpl);
  const res = await fetchImpl(`${REGIONS[region].base}/open/partner/users/access-token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${partner}`,
    },
    body: JSON.stringify({ user_id: userId, expires_in: USER_TOKEN_SECONDS }),
  });
  const body = await readJson(res, "user token");
  const seconds = Number(body.expires_in ?? USER_TOKEN_SECONDS) || USER_TOKEN_SECONDS;
  const early = Math.max(60, seconds - 120);
  return {
    userToken: String(body.access_token),
    userTokenExpiresAt: new Date(Date.now() + early * 1000).toISOString(),
  };
}

export default auth;
