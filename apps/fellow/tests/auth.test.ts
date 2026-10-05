import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../auth/api-key.ts";
import { mockCtx } from "./_helpers.ts";

const ME = {
  user: { id: "u1", email: "a@acme.com", full_name: "A" },
  workspace: { id: "w", name: "Acme", subdomain: "acme" },
};

Deno.test("auth: sign stamps X-API-KEY and nothing else", () => {
  const req = {
    url: "https://acme.fellow.app/api/v1/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  // deno-lint-ignore no-explicit-any
  const out = (apiKey.sign as any)({
    request: req,
    credential: { apiKey: " k123 ", subdomain: "acme" },
  });
  assertEquals(out.headers["x-api-key"], "k123");
  assertEquals(out.headers["authorization"], undefined);
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("auth.test: a /me body with user.id passes, sent to the workspace host with the key", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  const r = await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } } as never, ctx);
  assertEquals(r, { ok: true });
  assertEquals(calls[0].url, "https://acme.fellow.app/api/v1/me");
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("auth.test: judged on the body, not the status", async () => {
  // 200 but not the /me shape (e.g. an SPA shell) must not pass.
  const html = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  assertEquals(
    (await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } } as never, html.ctx)).ok,
    false,
  );
  const odd = mockCtx([{ body: { hello: 1 } }]);
  assertEquals(
    (await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } } as never, odd.ctx)).ok,
    false,
  );
});

Deno.test("auth.test: 401 detail, unknown workspace and missing fields are distinct messages", async () => {
  const bad = mockCtx([{ status: 401, body: { detail: "Unauthorized" } }]);
  const r1 = await apiKey.test!(
    { credential: { subdomain: "acme", apiKey: "bad" } } as never,
    bad.ctx,
  );
  assertEquals(r1.ok, false);
  assertEquals(r1.message?.includes("Unauthorized"), true);

  const nowhere = mockCtx([{
    status: 404,
    body: "<!doctype html>",
    headers: { "content-type": "text/html" },
  }]);
  const r2 = await apiKey.test!(
    { credential: { subdomain: "zz", apiKey: "k" } } as never,
    nowhere.ctx,
  );
  assertEquals(r2.message?.includes("zz.fellow.app"), true);

  const none = mockCtx([]);
  assertEquals(
    (await apiKey.test!({ credential: { subdomain: "acme" } } as never, none.ctx)).ok,
    false,
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("auth.test: a subdomain that could redirect elsewhere is refused before any request", async () => {
  for (const evil of ["evil.com/x", "a.b", "acme.fellow.app.evil.com", "-x", "a b"]) {
    const { ctx, calls } = mockCtx([]);
    const r = await apiKey.test!({ credential: { subdomain: evil, apiKey: "k" } } as never, ctx);
    assertEquals(r.ok, false, evil);
    assertEquals(calls.length, 0, evil);
  }
});

Deno.test("auth.test: pasting the full URL or host still resolves to the label", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  await apiKey.test!(
    { credential: { subdomain: "https://Acme.fellow.app/home", apiKey: "k" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.fellow.app/api/v1/me");
});

Deno.test("auth.afterConnect: publishes workspace label data, falls back to the subdomain", async () => {
  const ok = mockCtx([{ body: ME }]);
  assertEquals(
    await apiKey.afterConnect!({ credential: { subdomain: "acme", apiKey: "k" } } as never, ok.ctx),
    {
      subdomain: "acme",
      workspaceName: "Acme",
      email: "a@acme.com",
      userName: "A",
    },
  );
  const bad = mockCtx([{ status: 500, body: "x" }]);
  const r = await apiKey.afterConnect!(
    { credential: { subdomain: "acme", apiKey: "k" } } as never,
    bad.ctx,
  ) as Record<string, string>;
  assertEquals(r.workspaceName, "acme");
});
