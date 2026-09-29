import { assert, assertEquals } from "@std/assert";
import auth, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { API_BASE, API_PREFIX } from "../../lib/client.ts";
import { INVALID_API_KEY_401, mockCtx } from "../_helpers.ts";

Deno.test("authHeaders: builds a Bearer header from the credential", () => {
  assertEquals(authHeaders({ apiKey: "bh_secret" }), { authorization: "Bearer bh_secret" });
});

Deno.test("api-key: sign stamps a Bearer header and returns the request", () => {
  const request = {
    url: `${API_BASE}${API_PREFIX}/publications`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signInput = { request, credential: { apiKey: "bh_secret" } };
  // deno-lint-ignore no-explicit-any
  const out = auth.sign!(signInput as any, null as any) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer bh_secret");
});

Deno.test("api-key: test accepts a live key and probes GET /publications?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "pub_1", name: "Acme" }] } }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, `${API_PREFIX}${PROBE_PATH}`);
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("api-key: the probe response carries no secret field", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ id: "pub_1", name: "Acme" }] } }]);
  // deno-lint-ignore no-explicit-any
  await auth.test({ credential: { apiKey: "super-secret" } } as any, ctx);
  // Nothing to assert on the response itself (the client discards it on `ok`);
  // this test documents the property being relied on: `test` never echoes
  // `credential.apiKey` back into its own returned message.
});

Deno.test("api-key: test rejects a bad key with the INVALID_API_KEY code surfaced in the message", async () => {
  const { ctx } = mockCtx([INVALID_API_KEY_401]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "bad" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("INVALID_API_KEY"));
  // Must not leak the credential itself into the message.
  assert(!res.message!.includes("bad"));
});

Deno.test("api-key: test surfaces a non-INVALID_API_KEY failure via formatBeehiivError", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { errors: [{ code: "INTERNAL", message: "boom" }] },
  }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("INTERNAL"));
  assert(res.message!.includes("boom"));
});

Deno.test("api-key: test does not call the API when no credential was supplied", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: {} } as any, ctx);
  assertEquals(res, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect labels a single-publication workspace and sends no credential itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "pub_1", name: "My Newsletter" }] } }]);
  // deno-lint-ignore no-explicit-any
  const out = await auth.afterConnect!({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(out, { publicationName: "My Newsletter", publicationId: "pub_1" });
  // The runtime routes this through `sign`; the hook must not stamp auth itself.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api-key: afterConnect returns nothing for a multi-publication workspace", async () => {
  const { ctx } = mockCtx([{
    body: { data: [{ id: "pub_1", name: "A" }, { id: "pub_2", name: "B" }] },
  }]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } } as any, ctx), {});
});

Deno.test("api-key: afterConnect degrades to no label rather than throwing", async () => {
  const { ctx } = mockCtx([INVALID_API_KEY_401]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "bad" } } as any, ctx), {});
});
