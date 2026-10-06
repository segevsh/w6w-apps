import { assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const test = apiKey.test as any;
// deno-lint-ignore no-explicit-any
const sign = apiKey.sign as any;

Deno.test("api-key: sign stamps x-api-key", () => {
  const out = sign({ request: { headers: {} }, credential: { apiKey: "k1" } });
  assertEquals(out.headers["x-api-key"], "k1");
});

Deno.test("api-key: test passes only on a documented webhooks array", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [] } }]);
  assertEquals(await test({ credential: { apiKey: " k1 " } }, ctx), { ok: true });
  assertEquals(calls[0].url, `${API_ROOT}/webhook`);
  assertEquals(calls[0].headers["x-api-key"], "k1");
});

Deno.test("api-key: a 2xx without the documented body is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "shell" } }]);
  const r = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("api-key: both gateway 401 bodies are a rejection that quotes the vendor status", async () => {
  for (const status of ["Unauthorized", "Invalid api key"]) {
    const { ctx } = mockCtx([{ status: 401, body: { status } }]);
    const r = await test({ credential: { apiKey: "bad" } }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message.includes(status), true, r.message);
    assertEquals(r.message.includes("bad"), false, "credential must not be echoed");
  }
});

Deno.test("api-key: missing key and server errors fail without a request or with the status", async () => {
  const none = mockCtx();
  assertEquals((await test({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  const r = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message.includes("500"), true);
});
