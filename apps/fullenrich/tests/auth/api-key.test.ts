import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({
  url: "https://app.fullenrich.com/api/v2/account/credits",
  method: "GET",
  headers: {},
});

Deno.test("api-key: sign stamps a bearer token and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { apiKey: "fe_123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { authorization: "Bearer fe_123" });
});

Deno.test("api-key: declares the Bearer header and a secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  assertEquals(auth.fields![0].type, "secret");
});

Deno.test("api-key: test passes on a workspace_id body and calls the verify endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { workspace_id: "w1" } }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/account/keys/verify");
  assertEquals(calls[0].headers.authorization, "Bearer k");
});

Deno.test("api-key: a 200 without workspace_id is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("no workspace_id"));
});

Deno.test("api-key: test reports the vendor's own message for a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "error.api.key", message: "Unknown api key" },
  }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals([res.ok, res.message], [false, "Unknown api key"]);
});

Deno.test("api-key: a non-error body and a missing key are failures", async () => {
  const html = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<html/>",
  }]);
  const r1 = await auth.test!({ credential: { apiKey: "k" } }, html.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("non-error body"));
  assertEquals((await auth.test!({ credential: {} }, mockCtx().ctx)).ok, false);
});
