import { assert, assertEquals } from "@std/assert";
import auth, {
  isTimezoneList,
  PROFILE_PATH,
  TIMEZONES_PATH,
} from "../../auth/client-credentials.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const cred = {
  clientId: "id-123",
  clientSecret: "secret-456",
  accessToken: "access-789",
};

const timezones = [
  {
    label: "Eastern Time (US & Canada)",
    name: "Eastern Time (US & Canada)",
    tzName: "America/New_York",
  },
  { label: "UTC", name: "UTC", tzName: "Etc/UTC" },
];

const sign = (url: string, headers: Record<string, string> = {}) =>
  auth.sign!({
    request: { url, method: "GET", headers },
    credential: cred,
  } as never, mockCtx([]).ctx) as { url: string; headers: Record<string, string> };

Deno.test("client-credentials: it is the machine-to-machine grant, not a browser flow", () => {
  assertEquals(auth.key, "client-credentials");
  assertEquals(auth.type, "custom");
  assertEquals(auth.oauth2, undefined);
  assertEquals(typeof auth.revoke, "undefined");
});

Deno.test("client-credentials: both fields are required secrets", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["clientId", "clientSecret"]);
  for (const field of auth.fields!) {
    assertEquals(field.type, "secret", field.key);
    assertEquals(field.required, true, field.key);
  }
});

/**
 * The document's `OAuthTokenRequest` lists exactly two properties and contains
 * no `grant_type` anywhere, so the exchange sends exactly those two.
 */
Deno.test("client-credentials: exchange POSTs form-encoded client_id/client_secret only", async () => {
  const { ctx, calls } = mockCtx([{
    body: { access_token: "tok", expires_in: 3600, token_type: "Bearer" },
  }]);
  const credential = await auth.exchange!({
    fields: { clientId: "id-123", clientSecret: "secret-456" },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/oauth2/token`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "client_id=id-123&client_secret=secret-456");
  assert(!/grant_type/.test(calls[0].body!), calls[0].body!);
  assertEquals(credential.clientId, "id-123");
  assertEquals(credential.clientSecret, "secret-456");
  assertEquals(credential.accessToken, "tok");
});

Deno.test("client-credentials: expiresAt is computed from expires_in with a 60s haircut", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok", expires_in: 7200 } }]);
  const before = Date.now();
  const credential = await auth.exchange!({
    fields: { clientId: "id-123", clientSecret: "secret-456" },
  }, ctx) as { expiresAt: string };
  const expected = before + (7200 - 60) * 1000;
  const actual = Date.parse(credential.expiresAt);
  assert(Math.abs(actual - expected) < 5000, `${credential.expiresAt} vs ${expected}`);
});

Deno.test("client-credentials: a missing expires_in falls back to the documented nowhere one hour", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok" } }]);
  const before = Date.now();
  const credential = await auth.exchange!({
    fields: { clientId: "id-123", clientSecret: "secret-456" },
  }, ctx) as { expiresAt: string };
  const actual = Date.parse(credential.expiresAt);
  assert(Math.abs(actual - (before + (3600 - 60) * 1000)) < 5000, credential.expiresAt);
});

Deno.test("client-credentials: a missing field is refused before any request", async () => {
  for (const fields of [{}, { clientId: "id-123" }, { clientSecret: "secret-456" }]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await auth.exchange!({ fields }, ctx);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    assertEquals(message, "Client ID and Client Secret are both required.");
    assertEquals(calls.length, 0);
  }
});

Deno.test("client-credentials: a failed exchange names the status and never echoes the secret", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error_description: "invalid_client" } }]);
  let message = "";
  try {
    await auth.exchange!({ fields: { clientId: "id-123", clientSecret: "secret-456" } }, ctx);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assert(/HTTP 401/.test(message), message);
  assert(/invalid_client/.test(message), message);
  assert(!message.includes("secret-456"), message);
});

/**
 * There is no refresh grant and no refresh token in the document, so refresh is
 * the same client-credentials exchange run again.
 */
Deno.test("client-credentials: refresh re-runs the client-credentials exchange", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-2", expires_in: 1800 } }]);
  const credential = await auth.refresh!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `${API_ROOT}/oauth2/token`);
  assertEquals(calls[0].body, "client_id=id-123&client_secret=secret-456");
  assert(!/grant_type/.test(calls[0].body!), calls[0].body!);
  assertEquals(credential.accessToken, "tok-2");
  assertEquals(credential.refreshToken, undefined);
});

Deno.test("client-credentials: refresh without stored credentials refuses to guess", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.refresh!({ credential: { accessToken: "tok" } }, ctx);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message, "credential is missing clientId or clientSecret — reconnect");
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: sign stamps a Bearer header and nothing else", () => {
  const signed = sign(`${API_ROOT}/consultant/records`);
  assertEquals(signed.headers["authorization"], "Bearer access-789");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
  assertEquals(signed.url, `${API_ROOT}/consultant/records`);
});

Deno.test("client-credentials: sign tolerates a credential with no token", () => {
  const signed = auth.sign!({
    request: { url: `${API_ROOT}/tags`, method: "GET", headers: {} },
    credential: {},
  } as never, mockCtx([]).ctx) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "Bearer ");
});

/** The probe is `GET /timezones`, chosen by what its body contains. */
Deno.test("client-credentials: test probes GET /timezones and passes on the documented list", async () => {
  const { ctx, calls } = mockCtx([{ body: timezones }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/timezones`);
  assertEquals(calls[0].headers["authorization"], "Bearer access-789");
  assertEquals(result.ok, true);
  assert(/2 time zones listed/.test(result.message!), result.message);
});

Deno.test("client-credentials: an empty time-zone list is not proof of a live credential", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/did not return the documented time-zone list/.test(result.message!), result.message);
});

Deno.test("client-credentials: a 200 that is not the time-zone list is a failure, not a pass", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "someone-elses-endpoint" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/did not return the documented time-zone list/.test(result.message!), result.message);
});

/**
 * The document publishes no error body for this endpoint (or any other), so the
 * status is the classifier and the body is only evidence.
 */
Deno.test("client-credentials: a 401 is reported as a bad client id/secret", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 401/.test(result.message!), result.message);
  assert(/client id or client secret is wrong/.test(result.message!), result.message);
});

Deno.test("client-credentials: a 403 means the credential is live but under-scoped", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 403/.test(result.message!), result.message);
  assert(/credential is live/.test(result.message!), result.message);
  assert(/`read` scope/.test(result.message!), result.message);
});

Deno.test("client-credentials: any other non-2xx is surfaced with its status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500 for GET \/timezones/.test(result.message!), result.message);
});

Deno.test("client-credentials: a missing token is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(/missing an access token/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: an unreachable host fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach https:\/\/api\.practicebetter\.io/.test(result.message!), result.message);
});

/** The probe's result reaches the health surface; it must not carry the token. */
Deno.test("client-credentials: the probe never echoes the credential", async () => {
  const { ctx } = mockCtx([{ body: timezones }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(!JSON.stringify(result).includes("access-789"), JSON.stringify(result));
  assertEquals(Object.keys(timezones[0]).some((k) => /token|key|secret|password/i.test(k)), false);
});

Deno.test("client-credentials: the time-zone shape guard is strict about the documented field", () => {
  assertEquals(isTimezoneList(timezones), true);
  assertEquals(isTimezoneList([{ label: "no name here" }]), false);
  assertEquals(isTimezoneList([]), false);
  assertEquals(isTimezoneList({ name: "UTC" }), false);
});

Deno.test("client-credentials: afterConnect labels the Connection from the consultant profile", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "con-1",
      emailAddress: "practitioner@example.com",
      company: { name: "Whole Health" },
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}${PROFILE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer access-789");
  assertEquals(display, { emailAddress: "practitioner@example.com", company: "Whole Health" });
});

Deno.test("client-credentials: a failed or nameless afterConnect is silent, not fatal", async () => {
  const failing = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, failing.ctx), {});
  const empty = mockCtx([{ body: { id: "con-1" } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, empty.ctx), {});
  const noToken = mockCtx([]);
  assertEquals(await auth.afterConnect!({ credential: {} }, noToken.ctx), {});
  assertEquals(noToken.calls.length, 0);
});

Deno.test("client-credentials: the label template names a variable afterConnect publishes", () => {
  assertEquals(auth.connectionLabel, "Practice Better ({{emailAddress}})");
  assert(/read/.test(auth.description!), auth.description);
  assert(/scheduled/.test(auth.description!), auth.description);
  assertEquals(TIMEZONES_PATH, "/timezones");
});
