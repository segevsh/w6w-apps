import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const test = apiKey.test as any;
// deno-lint-ignore no-explicit-any
const sign = apiKey.sign as any;
// deno-lint-ignore no-explicit-any
const afterConnect = apiKey.afterConnect as any;

Deno.test("api-key: sign stamps a Bearer header", () => {
  const req = sign({ request: { headers: {} }, credential: { apiKey: "k1" } });
  assertEquals(req.headers.authorization, "Bearer k1");
});

Deno.test("api-key: the probe is /account and is not a key-echoing endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a", company: "Acme" } } }]);
  const out = await test({ credential: { apiKey: "k1" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(PROBE_PATH, "/account");
  assertEquals(new URL(calls[0].url).pathname, "/v1/account");
  assertEquals(calls[0].headers.authorization, "Bearer k1");
});

Deno.test("api-key: a missing key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: the vendor's 401 body is classified as a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  const out = await test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assert(/rejected/i.test(out.message), out.message);
});

Deno.test("api-key: an unauthorized body is a rejection even on a non-401 status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "Unauthorized. Token not found" } }]);
  const out = await test({ credential: { apiKey: "bad" } }, ctx);
  assert(/rejected/i.test(out.message), out.message);
});

Deno.test("api-key: a 200 that is not the account shape is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>spa shell</html>", headers: {} }]);
  const out = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("api-key: other failures report the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const out = await test({ credential: { apiKey: "k" } }, ctx);
  assert(out.message.includes("503"));
});

Deno.test("api-key: afterConnect keeps only the company name", async () => {
  const { ctx } = mockCtx([{
    body: { account: { company: "Acme", id: "a", default_currency: { id: "usd" } } },
  }]);
  assertEquals(await afterConnect({ credential: { apiKey: "k" } }, ctx), { company: "Acme" });
});

Deno.test("api-key: afterConnect swallows failures", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await afterConnect({ credential: { apiKey: "k" } }, ctx), {});
  const throwing = {
    fetch: () => Promise.reject(new Error("x")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals(await afterConnect({ credential: { apiKey: "k" } }, throwing), {});
});
