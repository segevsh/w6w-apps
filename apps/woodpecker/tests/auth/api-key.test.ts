import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey0000";
const REJECTION = {
  title: "Unauthorized",
  status: 401,
  detail: "Invalid api key",
  timestamp: "2026-10-06 06:34:59",
};

Deno.test("api-key: sign stamps x-api-key and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.woodpecker.co/rest/v2/users",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["x-api-key"], KEY);
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
});

Deno.test("api-key: the probe is the user list, which never carries a key", () => {
  assertEquals(PROBE_PATH, "/rest/v2/users");
});

Deno.test("api-key: test passes when the probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { content: [], pagination_data: {} } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/rest/v2/users");
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test fails with no key and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "  " } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejection is recognised from the body, not the status", async () => {
  for (const status of [401, 403, 400]) {
    const { ctx } = mockCtx([{ status, body: REJECTION }]);
    const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);
    assertEquals(result.ok, false);
    assert(/rejected the API key/i.test(result.message ?? ""), `${status}: ${result.message}`);
  }
});

Deno.test("api-key: a plan without the API add-on is reported as such", async () => {
  for (const detail of ["No API addon", "Upgrade your plan"]) {
    const { ctx } = mockCtx([{ status: 401, body: { ...REJECTION, detail } }]);
    const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
    assertEquals(result.ok, false);
    assert((result.message ?? "").includes("plan has no API access"), detail);
  }
});

Deno.test("api-key: an unknown failure is reported verbatim", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { title: "x", detail: "boom" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500") && (result.message ?? "").includes("boom"));
});

Deno.test("api-key: a 2xx passes even when the status is not 200", async () => {
  const { ctx } = mockCtx([{ status: 206, body: {} }]);
  assertEquals((await apiKey.test({ credential: { apiKey: KEY } }, ctx)).ok, true);
});
