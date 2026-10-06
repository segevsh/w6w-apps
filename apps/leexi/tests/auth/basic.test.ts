import { assert, assertEquals } from "@std/assert";
import auth, { basicHeader, classifyProbe } from "../../auth/basic.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { keyId: "kid", keySecret: "ksecret" };
const expected = `Basic ${btoa("kid:ksecret")}`;

Deno.test("basic: sign stamps the Basic header and touches nothing else", () => {
  const request = { url: "https://public-api.leexi.ai/v1/users", method: "GET", headers: {} };
  const out = auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { authorization: expected });
  assertEquals((out as typeof request).url, "https://public-api.leexi.ai/v1/users");
});

Deno.test("basic: basicHeader is base64(keyId:keySecret)", () => {
  assertEquals(basicHeader(cred), "Basic a2lkOmtzZWNyZXQ=");
  assertEquals(basicHeader({}), `Basic ${btoa(":")}`);
});

Deno.test("basic: declares type basic and two secret, required fields", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.length, 2);
  for (const f of auth.fields!) {
    assertEquals(f.type, "secret");
    assertEquals(f.required, true);
  }
});

Deno.test("basic: test passes on a list envelope and probes GET /calls?items=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: { page: 1 } } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/calls");
  assertEquals(url.searchParams.get("items"), "1");
  assertEquals(calls[0].headers.authorization, expected);
});

Deno.test("basic: test fails a 200 that is not a list envelope", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not a Leexi list envelope"));
});

Deno.test("basic: test treats an empty-bodied 401 as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
});

Deno.test("basic: test treats 403 as a live key without the read_calls scope", async () => {
  const { ctx } = mockCtx([{ status: 403, headers: { "content-type": "text/html" } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, true);
});

Deno.test("basic: test fails when a field is missing without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test!({ credential: { keyId: "kid" } }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: test reports a network failure instead of throwing", async () => {
  const { ctx } = mockCtx([]); // no queued response: the fake fetch throws
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("could not reach"));
});

Deno.test("classifyProbe: pins every documented status", () => {
  assertEquals(classifyProbe(200, { data: [] }).ok, true);
  assertEquals(classifyProbe(403, null).ok, true);
  assertEquals(classifyProbe(401, null).ok, false);
  assert(classifyProbe(402, null).message!.includes("subscription"));
  assert(classifyProbe(429, null).message!.includes("rate-limited"));
  assert(classifyProbe(503, null).message!.includes("erroring"));
  assert(classifyProbe(418, null).message!.includes("418"));
});
