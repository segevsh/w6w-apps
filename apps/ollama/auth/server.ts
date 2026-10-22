import type { AuthDefinition } from "@w6w/types";
import {
  buildBaseUrl,
  DEFAULT_PORT,
  describeError,
  endpointLabel,
  isPrivateHost,
  parseEndpoint,
} from "../lib/client.ts";

/**
 * Where the user's Ollama server is, and — optionally — the key a reverse proxy
 * in front of it wants.
 *
 * ## No secret is required, and the contract has no "none" type
 *
 * Ollama has no authentication of its own. `AuthType` has no `none` (the
 * choices are `oauth2`, `apiKey`, `basic`, `bearer`, `custom`, `tenantAuth` and
 * `jit`), and `bearer`/`apiKey` both imply a secret. `custom` is the type that
 * lets this method carry only connection fields, with a `sign` hook that does
 * nothing unless a key was entered. The connection is still the right place for
 * the address: it is what a connection *is* here.
 *
 * ## The address is three fields, validated in one place
 *
 * `scheme`, `host` and `port` are assembled by `buildBaseUrl` in `lib/client.ts`
 * and nowhere else. It refuses a pasted URL, credentials in the host, a path,
 * and a port outside 1-65535, so a mistyped field cannot turn into a request to
 * somewhere the user did not mean.
 *
 * ## Reachability is the thing that fails, so the test says why
 *
 * - A LAN or localhost address only works when workflows run on the same network
 *   (a self-hosted runner). Hosted runs need a tunnel or a reverse proxy.
 * - Ollama binds `127.0.0.1` by default. From any other machine the connection is
 *   refused until the server runs with `OLLAMA_HOST=0.0.0.0`.
 * The test reports an unreachable host in those words instead of a bare timeout.
 */
const server: AuthDefinition = {
  key: "server",
  type: "custom",
  displayName: "Ollama Server",
  description:
    "The address of your Ollama server (IP or hostname, port, http or https) and, only if a " +
    "reverse proxy in front of it requires one, an API key. Ollama itself needs no credentials.",
  connectionLabel: "Ollama ({{endpoint}})",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      required: true,
      default: "",
      placeholder: "192.168.1.50",
      row: "address",
      hint: "The IP address or hostname only — no `http://`, no port, no path. A LAN or " +
        "localhost address works only when workflows run on the same network (a self-hosted " +
        "runner); hosted runs need a tunnel or reverse proxy with a public hostname. Ollama " +
        "listens on 127.0.0.1 by default, so reaching it from another machine needs " +
        "`OLLAMA_HOST=0.0.0.0` on the server.",
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      required: false,
      default: DEFAULT_PORT,
      placeholder: String(DEFAULT_PORT),
      row: "address",
      hint: "1-65535. Ollama's default is 11434; use 443 or 80 if a reverse proxy fronts it.",
    },
    {
      key: "scheme",
      label: "Scheme",
      type: "select",
      required: true,
      default: "http",
      row: "address",
      options: [
        { value: "http", label: "http" },
        { value: "https", label: "https" },
      ],
      hint: "Ollama serves plain http itself. Choose https only when a reverse proxy or tunnel " +
        "terminates TLS in front of it.",
    },
    {
      key: "apiKey",
      label: "API Key (optional)",
      type: "secret",
      required: false,
      hint: "Ollama has no authentication, so leave this blank for a plain install. Fill it " +
        "in only if a reverse proxy in front of the server requires a bearer token; it is " +
        "then sent as `Authorization: Bearer <key>` and never otherwise.",
    },
  ],

  /** Sends `Authorization` only when a key was entered — a bare server gets no header. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey?: string };
    const key = String(apiKey ?? "").trim();
    if (key) request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * `GET /api/version` — `{"version": "0.34.1"}`, the lightest call Ollama has,
   * which loads no model and lists nothing.
   */
  async test({ credential }, ctx) {
    const cred = credential as {
      scheme?: string;
      host?: string;
      port?: number | string;
      apiKey?: string;
    };

    let base: string;
    let host: string;
    try {
      ({ host } = parseEndpoint(cred));
      base = buildBaseUrl(cred);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
    const label = endpointLabel(cred);
    const key = String(cred.apiKey ?? "").trim();

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/version`, {
        headers: {
          accept: "application/json",
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
      });
    } catch (err) {
      const tail = `(${String((err as Error)?.message ?? err)})`;
      const bind = "Ollama listens on 127.0.0.1 by default — to reach it from another machine " +
        "start it with OLLAMA_HOST=0.0.0.0 and allow the port through the firewall";
      if (isPrivateHost(host)) {
        return {
          ok: false,
          message: `could not reach ${label}, which is a private/LAN address — a hosted runner ` +
            "cannot see it, so this only works when workflows run on the same network (a " +
            `self-hosted runner); otherwise use a tunnel or a reverse proxy with a public ` +
            `hostname. If the runner IS on that network: ${bind}. ${tail}`,
        };
      }
      return {
        ok: false,
        message: `could not reach ${label}: check the host, port and scheme, and that the ` +
          `server is running and publicly reachable. ${bind}. ${tail}`,
      };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: key
          ? `${label} rejected the API key — ${describeError(res.status, text)}`
          : `${label} requires an API key, which means a reverse proxy sits in front of ` +
            "Ollama — enter the key it expects",
      };
    }
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let body: { version?: unknown } | null = null;
    try {
      body = JSON.parse(text) as { version?: unknown };
    } catch { /* handled below */ }
    if (typeof body?.version !== "string") {
      return {
        ok: false,
        message: `${label} answered, but not like Ollama (no \`version\` in /api/version) — ` +
          "this is usually the wrong port, or a proxy or login page in the way. Check the " +
          `port and scheme (Ollama's default is ${DEFAULT_PORT} over http)`,
      };
    }
    return { ok: true, message: `connected to Ollama ${body.version} at ${label}` };
  },

  /**
   * Records where the server is and which version, so no action has to ask and
   * the connection label reads `Ollama (192.168.1.50:11434)`. Never the key.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as {
      scheme?: string;
      host?: string;
      port?: number | string;
      apiKey?: string;
    };
    let endpoint;
    try {
      endpoint = parseEndpoint(cred);
    } catch {
      return {};
    }
    const base = buildBaseUrl(cred);
    const key = String(cred.apiKey ?? "").trim();
    const display: Record<string, unknown> = {
      baseUrl: base,
      scheme: endpoint.scheme,
      host: endpoint.host,
      port: endpoint.port,
      endpoint: endpointLabel(cred),
      authenticated: key !== "",
    };

    try {
      const res = await ctx.fetch(`${base}/api/version`, {
        headers: {
          accept: "application/json",
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return display;
      }
      const body = await res.json().catch(() => null) as { version?: string } | null;
      if (typeof body?.version === "string") display.version = body.version;
    } catch { /* the label does not need it */ }
    return display;
  },
};

export default server;
