import { assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";

type Req = { headers: Record<string, string> };
const test = (cred: unknown, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  apiKey.test!({ credential: cred } as never, ctx);

Deno.test("api-key: sign stamps x-perspective-api-key with no prefix", () => {
  const out = apiKey.sign!(
    { request: { headers: {} } as Req, credential: { apiKey: "k_1" } } as never,
    mockCtx().ctx,
  );
  assertEquals((out as unknown as Req).headers["x-perspective-api-key"], "k_1");
});

Deno.test("api-key: declares a header apiKey and one secret field", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "x-perspective-api-key" });
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type]), [["apiKey", "secret"]]);
});

Deno.test("api-key: test passes on a data array and probes /workspaces with the key", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  assertEquals(await test({ apiKey: " k_1 " }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.perspective.co/v1/workspaces");
  assertEquals(calls[0].headers["x-perspective-api-key"], "k_1");
});

Deno.test("api-key: a 200 without a data array is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test({ apiKey: "k" }, ctx)).ok, false);
});

Deno.test("api-key: missing credential makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({}, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: 401 'required' and 401 'invalid' are told apart by body", async () => {
  const none = mockCtx([{ status: 401, body: errorBody("API key is required", 401) }]);
  const r1 = await test({ apiKey: "k" }, none.ctx);
  assertEquals(r1.ok, false);
  assertEquals(r1.message?.includes("received no API key"), true);

  const bad = mockCtx([{ status: 401, body: errorBody("Invalid or unauthorized API key", 401) }]);
  const r2 = await test({ apiKey: "k" }, bad.ctx);
  assertEquals(r2.ok, false);
  assertEquals(r2.message?.includes("rejected the API key"), true);
});

Deno.test("api-key: 403 means the key authenticated, so the connection is accepted", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden", 403) }]);
  assertEquals(await test({ apiKey: "k" }, ctx), { ok: true });
});

Deno.test("api-key: a 500 is a failure carrying the vendor text", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("boom", 500) }]);
  const r = await test({ apiKey: "k" }, ctx);
  assertEquals(r, { ok: false, message: "Perspective 500: boom" });
});
