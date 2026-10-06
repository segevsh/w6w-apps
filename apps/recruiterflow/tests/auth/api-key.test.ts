import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const cred = { apiKey: "k-123" };

Deno.test("sign: stamps the RF-Api-Key header", () => {
  const req = { headers: {} as Record<string, string> };
  const out = apiKey.sign!({ request: req, credential: cred } as never, undefined as never);
  assertEquals((out as typeof req).headers["rf-api-key"], "k-123");
  assertEquals(authHeaders({}), { "rf-api-key": "" });
});

Deno.test("test: documented display_name passes, and the key rides the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { display_name: "Acme Recruiting" } } }]);
  const out = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/info");
  assertEquals(calls[0].headers["rf-api-key"], "k-123");
});

Deno.test("test: a 200 without the documented field is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "spa" } }]);
  assertEquals((await apiKey.test({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("test: classified from the body, not the status (400 missing vs 401 invalid)", async () => {
  const missing = mockCtx([{ status: 400, body: { message: "Please supply an API key" } }]);
  const r1 = await apiKey.test({ credential: cred } as never, missing.ctx);
  assertEquals(r1.ok, false);
  assert(/no key/i.test(r1.message ?? ""));

  const bad = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  const r2 = await apiKey.test({ credential: cred } as never, bad.ctx);
  assertEquals(r2.ok, false);
  assert(/rejected/i.test(r2.message ?? ""));

  const odd = mockCtx([{ status: 502, body: "bad gateway" }]);
  const r3 = await apiKey.test({ credential: cred } as never, odd.ctx);
  assert(/HTTP 502/.test(r3.message ?? ""));
});

Deno.test("test: a blank key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: " " } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: publishes the display name; failures are silent", async () => {
  const ok = mockCtx([{ body: { data: { display_name: "Acme" } } }]);
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, ok.ctx), {
    displayName: "Acme",
  });
  const none = mockCtx([]);
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, none.ctx), {});
});
