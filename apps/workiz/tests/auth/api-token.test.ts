import { assert, assertEquals } from "@std/assert";
import apiToken, { PROBE_PATH, signedUrl, signRequest } from "../../auth/api-token.ts";
import { API_ROOT, forbiddenBody, mockCtx } from "../_helpers.ts";

const TOKEN = "ax7f9c2unitTestFixtureNotARealToken";

Deno.test("api-token: sign splices the token into the path and touches nothing else", () => {
  const request = {
    method: "GET",
    url: `${API_ROOT}/team/all/`,
    headers: { accept: "application/json" } as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    method: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.url, `https://api.workiz.com/api/v1/${TOKEN}/team/all/`);
  assertEquals(signed.method, "GET");
  // No header is added: Workiz documents no authorization header at all.
  assertEquals(signed.headers, { accept: "application/json" });
  assertEquals(Object.keys(signed.headers).length, 1);
});

Deno.test("api-token: signedUrl is the single source of the wire path", () => {
  assertEquals(
    signedUrl(`${API_ROOT}/lead/all/`, TOKEN),
    `https://api.workiz.com/api/v1/${TOKEN}/lead/all/`,
  );
  // The API prefix goes BEFORE the endpoint path, and the token between them.
  assertEquals(
    signedUrl(`${API_ROOT}/job/get/abc-123/`, "tok"),
    "https://api.workiz.com/api/v1/tok/job/get/abc-123/",
  );
});

/** An empty credential must fail loudly rather than build `/api/v1//…`. */
Deno.test("api-token: signing without a token throws", () => {
  let threw = false;
  try {
    signedUrl(`${API_ROOT}/team/all/`, "");
  } catch {
    threw = true;
  }
  assert(threw, "an empty token produced a URL instead of failing");
});

/** Signing twice would produce `/api/v1/<tok>/api/v1/<tok>/…`, which is a 403. */
Deno.test("api-token: signing an already-signed path throws", () => {
  const signed = signedUrl(`${API_ROOT}/team/all/`, TOKEN);
  let threw = false;
  try {
    signedUrl(signed, TOKEN);
  } catch {
    threw = true;
  }
  assert(threw, "a double-signed path was accepted");
});

Deno.test("api-token: the credential's token is trimmed, never echoed", () => {
  const request = {
    method: "GET",
    url: `${API_ROOT}/team/all/`,
    headers: {} as Record<string, string>,
  };
  const signed = signRequest(request, { apiToken: `  ${TOKEN}  ` });
  assertEquals(signed.url, `https://api.workiz.com/api/v1/${TOKEN}/team/all/`);
  // The credential value itself never appears as a bare string anywhere else.
  assertEquals(signed.headers, {});
});

Deno.test("api-token: the probe is /team/all/, the one parameterless read", () => {
  assertEquals(PROBE_PATH, "/team/all/");
});

Deno.test("api-token: test passes when the team list answers an array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "u1", name: "Dana", role: "Admin" }] }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  // The probe goes out signed, on the token-bearing path — not on the raw one.
  assertEquals(calls[0].url, `https://api.workiz.com/api/v1/${TOKEN}/team/all/`);
});

/**
 * The classification is by BODY, not by status: Workiz's own error text is
 * generic enough that `{success:false, error:"Forbidden"}` is the reliable
 * signal. Nor may the token itself ever appear in a message.
 */
Deno.test("api-token: the Forbidden body is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: forbiddenBody() }]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API token/i.test(result.message ?? ""), result.message);
  assert(
    (result.message ?? "").includes("Invalid API path or malformed API key."),
    `vendor message missing: ${result.message}`,
  );
  assert(!(result.message ?? "").includes("garbage"), "the token leaked into the message");
});

/** A 200 carrying the Forbidden shape is still a rejection — status is not the signal. */
Deno.test("api-token: a 200 carrying the Forbidden body is still a rejection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: forbiddenBody("Invalid API path.") }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/Invalid API path\./.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 5xx is an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
  assert(!/rejected/i.test(result.message ?? ""), result.message);
});

/** A valid token whose account has no team rows must not be called invalid. */
Deno.test("api-token: a non-array success body is reported as unexpected, not invalid", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/unexpected body/i.test(result.message ?? ""), result.message);
  assert(!/rejected/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect publishes only the first member's name and role", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [
        { id: "u1", name: "Dana", role: "Admin", email: "dana@example.test" },
        { id: "u2", name: "Sam", role: "Tech" },
      ],
    },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(calls[0].url, `https://api.workiz.com/api/v1/${TOKEN}/team/all/`);
  assertEquals(display, { teamName: "Dana", role: "Admin" });
  assert(!JSON.stringify(display).includes("dana@example.test"), "email leaked into the label");
  assert(!JSON.stringify(display).includes("u1"), "vendor id leaked into the label");
});

Deno.test("api-token: afterConnect stays silent when the read fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: forbiddenBody() }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: afterConnect stays silent when the team list is empty", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: "tok" } }, ctx), {});
});

Deno.test("api-token: afterConnect makes no request without a token", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await apiToken.afterConnect!({ credential: {} }, ctx), {});
  assertEquals(calls.length, 0);
});
