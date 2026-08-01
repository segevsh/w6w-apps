import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: declares the apiKey config with PagerDuty's non-standard prefix", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Token token=" });
});

Deno.test("api-token: sign sets `Authorization: Token token=<key>`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.pagerduty.com/incidents",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "pd-key-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Token token=pd-key-123");
});

Deno.test("api-token: test probes GET /abilities and reports the upstream status", async () => {
  const ok = mockCtx([{ status: 200, body: { abilities: [] } }]);
  assertEquals(await auth.test({ credential: { apiKey: "k" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://api.pagerduty.com/abilities");
  assertEquals(ok.calls[0].headers["authorization"], "Token token=k");

  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { apiKey: "k" } }, bad.ctx), {
    ok: false,
    message: "PagerDuty returned 401",
  });
});

Deno.test("api-token: test reports missing credential without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect fetches /users/me and degrades gracefully on failure", async () => {
  const ok = mockCtx([
    { status: 200, body: { user: { id: "U1", name: "Ada", email: "ada@example.com" } } },
  ]);
  const label = await auth.afterConnect!({ credential: { apiKey: "k" } }, ok.ctx);
  assertEquals(label, { user: { id: "U1", name: "Ada", email: "ada@example.com" } });

  // Account-level keys 400/401 on /users/me — afterConnect must not throw.
  const bad = mockCtx([{ status: 401, body: {} }]);
  const empty = await auth.afterConnect!({ credential: { apiKey: "k" } }, bad.ctx);
  assertEquals(empty, {});
});
