import { assert, assertEquals } from "@std/assert";
import { mockCtx, NOT_FOUND_404, UNAUTHORIZED_401 } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_BASE } from "../../lib/client.ts";

Deno.test("api-key: sign stamps a Bearer header and returns the request", () => {
  const request = {
    url: `${API_BASE}/workspace`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  // deno-lint-ignore no-explicit-any
  const out = auth.sign!({ request, credential: { apiKey: "ot_secret" } } as any, null as any);
  assertEquals((out as typeof request).headers["authorization"], "Bearer ot_secret");
});

Deno.test("api-key: test accepts a live key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 42, name: "Acme" } } }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, `${API_BASE}/workspace`);
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("api-key: the probe asks for workspace metadata only, never a key-bearing field", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 42, name: "Acme" } } }]);
  // deno-lint-ignore no-explicit-any
  await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/workspace");
});

Deno.test("api-key: test rejects a bad key as a credential problem", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "bad" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
  assert(res.message!.includes("unauthorized"));
});

Deno.test("api-key: test distinguishes a live key with no workspace from a bad key", async () => {
  const { ctx } = mockCtx([NOT_FOUND_404]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not in a workspace"));
  // Must not be phrased as a bad-credential message — the two are different fixes.
  assert(!res.message!.includes("rejected"));
});

Deno.test("api-key: test does not call the API when no credential was supplied", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: {} } as any, ctx);
  assertEquals(res, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect returns the label variable and sends no credential itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 42, name: "Acme" } } }]);
  // deno-lint-ignore no-explicit-any
  const out = await auth.afterConnect!({} as any, ctx);
  assertEquals(out, { workspace: { name: "Acme" } });
  // The runtime routes this through `sign`; the hook must not stamp auth itself.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(auth.connectionLabel, "{{workspace.name}}");
});

Deno.test("api-key: afterConnect degrades to no label rather than throwing", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({} as any, ctx), {});
});
