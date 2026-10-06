import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf, WS } from "../_helpers.ts";

const cred = { apiKey: "secret-key-123", workspaceId: WS };

Deno.test("api-key: sign stamps the bearer header and nothing else", async () => {
  const req = {
    method: "GET",
    url: "https://go.ninox.com/x",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request: req, credential: cred } as never, mockCtx().ctx);
  assertEquals((out as typeof req).headers, { authorization: "Bearer secret-key-123" });
});

Deno.test("api-key: declares a secret key field and a 12-char workspace id field", () => {
  const fields = apiKey.fields!;
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "workspaceId")?.required, true);
});

Deno.test("api-key: test passes only on a {data: []} body from the module list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  assertEquals(await apiKey.test!({ credential: cred } as never, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules`);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "Bearer secret-key-123");
});

Deno.test("api-key: a 200 HTML shell is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<!doctype html><html></html>", headers: {} }]);
  const res = await apiKey.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("not a"));
});

Deno.test("api-key: the text/plain 401 is reported as a rejection and never echoes the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Workspace orchestrator error", headers: {} }]);
  const res = await apiKey.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("401"));
  assert(!res.message?.includes("secret-key-123"));
});

Deno.test("api-key: 403 and 404 are told apart", async () => {
  const r403 = await apiKey.test!(
    { credential: cred } as never,
    mockCtx([{ status: 403, body: errorBody("Insufficient API key scope") }]).ctx,
  );
  assert(r403.message?.includes("scope"));
  const r404 = await apiKey.test!(
    { credential: cred } as never,
    mockCtx([{ status: 404, body: errorBody("Workspace not found") }]).ctx,
  );
  assert(r404.message?.includes("no workspace"));
});

Deno.test("api-key: missing or malformed fields fail before any request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await apiKey.test!({ credential: { workspaceId: WS } } as never, ctx)).ok, false);
  assertEquals((await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx)).ok, false);
  const bad = await apiKey.test!(
    { credential: { apiKey: "k", workspaceId: "SHORT" } } as never,
    ctx,
  );
  assertEquals(bad.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the workspace id and name", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { name: "Acme", modules: [] } } }]);
  const out = await apiKey.afterConnect!({ credential: cred } as never, ctx);
  assertEquals(out, { workspaceId: WS, workspaceName: "Acme" });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}`);
});

Deno.test("api-key: afterConnect still publishes the id when the read fails or throws", async () => {
  const failed = await apiKey.afterConnect!(
    { credential: cred } as never,
    mockCtx([{ status: 401, body: "no", headers: {} }]).ctx,
  );
  assertEquals(failed, { workspaceId: WS });
  const thrown = await apiKey.afterConnect!({ credential: cred } as never, mockCtx().ctx);
  assertEquals(thrown, { workspaceId: WS });
});
