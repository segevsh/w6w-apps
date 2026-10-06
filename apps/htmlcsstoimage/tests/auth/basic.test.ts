import { assert, assertEquals } from "@std/assert";
import basic, { authHeader, PROBE_PATH } from "../../auth/basic.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { apiId: "user-id-1", apiKey: "unit-test-fixture-not-a-key" };
const EXPECTED = `Basic ${btoa("user-id-1:unit-test-fixture-not-a-key")}`;

Deno.test("basic: sign stamps Basic base64(id:key) and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://hcti.io/v1/images",
    headers: {} as Record<string, string>,
  };
  const signed = basic.sign!({ request, credential: CRED }, {} as never) as typeof request;
  assertEquals(signed.headers.authorization, EXPECTED);
  assertEquals(signed.url, "https://hcti.io/v1/images");
  assertEquals(authHeader(CRED), EXPECTED);
});

Deno.test("basic: the probe is /v1/usage, never the credit-spending POST /v1/image", () => {
  assertEquals(PROBE_PATH, "/v1/usage");
});

Deno.test("basic: test passes on a 200 with the documented usage body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { hour: {}, day: {}, month: {} }, per_billing_period: [] },
  }]);
  assertEquals(await basic.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/usage");
  assertEquals(calls[0].headers.authorization, EXPECTED);
});

Deno.test("basic: a 401 'API Key is Invalid' fails and quotes the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized", "API Key is Invalid", 401),
  }]);
  const r = await basic.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("API Key is Invalid"), r.message);
  assert(!r.message?.includes(CRED.apiKey));
});

Deno.test("basic: a 403 from a key scoped away from usage:read still proves a live credential", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("Forbidden", "Requires usage:read", 403),
  }]);
  assertEquals(await basic.test({ credential: CRED }, ctx), { ok: true });
});

Deno.test("basic: other failures name the status and vendor message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("Server Error", "boom", 500) }]);
  const r = await basic.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("500") && r.message.includes("boom"), r.message);
});

Deno.test("basic: a missing half of the credential fails without any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await basic.test({ credential: { apiId: "x" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});
