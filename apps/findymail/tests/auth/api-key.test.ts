import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

Deno.test("auth: declares an apiKey method with a secret field and Bearer header", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields![0].type, "secret");
});

Deno.test("auth: sign stamps the Bearer token and nothing else", async () => {
  const req = { url: "https://app.findymail.com/api/credits", method: "GET", headers: {} } as never;
  const out = await auth.sign!(
    { request: req, credential: { apiKey: "tok" } } as never,
    {} as never,
  );
  assertEquals((out as { headers: Record<string, string> }).headers["authorization"], "Bearer tok");
});

Deno.test("auth.test: a credits balance is a live key, and the probe is GET /api/credits", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: 150, verifier_credits: 100 } }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/credits");
  assertEquals(calls[0].method, "GET");
});

Deno.test("auth.test: Unauthenticated is rejected from the body message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const r = await auth.test!({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("Unauthenticated."));
});

Deno.test("auth.test: a paused subscription (423 error body) still proves the key", async () => {
  const { ctx } = mockCtx([{ status: 423, body: { error: "Subscription is paused" } }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
});

Deno.test("auth.test: a 200 without a balance, a 5xx, an HTML 4xx, no key and a network error all fail", async () => {
  const shape = mockCtx([{ body: { hello: "world" } }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, shape.ctx)).message!.includes("no credits"),
  );
  const five = mockCtx([{ status: 500, body: { message: "Server Error" } }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, five.ctx)).message!.includes(
      "erroring (500)",
    ),
  );
  const html = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, html.ctx)).message!.includes(
      "non-error body",
    ),
  );
  const none = mockCtx([]);
  const missing = await auth.test!({ credential: {} }, none.ctx);
  assertEquals(missing.ok, false);
  assertEquals(none.calls.length, 0);
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, ctx)).message!.includes("could not reach"),
  );
});
