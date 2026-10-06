import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { accessToken: "tok-1" };
const userInfo = { status: 200, success: true, data: { id: 1, name: "U", store: { id: 2 } } };

Deno.test("sign: stamps the bearer token and JSON accept header", () => {
  const request = {
    url: "https://api.salla.dev/admin/v2/products",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = oauth2.sign!({ request, credential } as never, {} as never) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer tok-1");
  assertEquals(out.headers["accept"], "application/json");
});

Deno.test("config: documented endpoints, scopes and no PKCE", () => {
  const o = oauth2.oauth2!;
  assertEquals(o.authorizationUrl, "https://accounts.salla.sa/oauth2/auth");
  assertEquals(o.tokenUrl, "https://accounts.salla.sa/oauth2/token");
  for (
    const s of [
      "offline_access",
      "settings.read",
      "products.read_write",
      "orders.read_write",
      "customers.read_write",
      "categories.read_write",
      "brands.read_write",
      "marketing.read_write",
    ]
  ) assert(o.scopes!.includes(s), s);
  assertEquals(o.pkce, false);
});

Deno.test("test: a user-info body is ok, and the probe hits accounts.salla.sa user/info", async () => {
  const { ctx, calls } = mockCtx([{ body: userInfo }]);
  assertEquals(await oauth2.test({ credential } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://accounts.salla.sa/oauth2/user/info");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-1");
});

Deno.test("test: the credential is never echoed in the result", async () => {
  const { ctx } = mockCtx([{ body: userInfo }]);
  const r = await oauth2.test({ credential } as never, ctx);
  assert(!JSON.stringify(r).includes("tok-1"));
});

Deno.test("test: missing accessToken fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: an invalid-token body fails, whatever status carries it", async () => {
  for (const status of [401, 403, 200]) {
    const { ctx } = mockCtx([{
      status,
      body: {
        status: 401,
        success: false,
        error: { code: "Unauthorized", message: "The access token is invalid" },
      },
    }]);
    const r = await oauth2.test({ credential } as never, ctx);
    assertEquals(r.ok, false, `status ${status}`);
    assertEquals(r.message, "The access token is invalid");
  }
});

Deno.test("test: a missing-scope 401 proves the token works and passes", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      status: 401,
      success: false,
      error: {
        code: "Unauthorized",
        message: "The access token should have access to one of those scopes: products.read_write",
      },
    },
  }]);
  const r = await oauth2.test({ credential } as never, ctx);
  assertEquals(r.ok, true);
  assert(r.message?.includes("products.read_write"));
});

Deno.test("test: an OAuth-server error (invalid_grant) fails with its description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_grant", error_description: "The token was revoked" },
  }]);
  const r = await oauth2.test({ credential } as never, ctx);
  assertEquals(r, { ok: false, message: "The token was revoked" });
});

Deno.test("test: a 200 that is not user information fails", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await oauth2.test({ credential } as never, ctx)).ok, false);
  const b = mockCtx([{ body: { success: true, data: {} } }]);
  assertEquals((await oauth2.test({ credential } as never, b.ctx)).ok, false);
});

Deno.test("test: an unreadable 5xx fails with the status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "Bad gateway" }]);
  const r = await oauth2.test({ credential } as never, ctx);
  assertEquals(r, { ok: false, message: "Salla returned 502" });
});

Deno.test("afterConnect: returns the store label data", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { name: "U", store: { id: 2, name: "Shop", plan: "pro", owner_name: "x" } } },
  }]);
  const out = await oauth2.afterConnect!({} as never, ctx);
  assertEquals(out, { store: { id: 2, name: "Shop", plan: "pro" } });
  assertEquals(calls[0].url, "https://accounts.salla.sa/oauth2/user/info");
});

Deno.test("afterConnect: a failed lookup yields no label rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await oauth2.afterConnect!({} as never, ctx), {});
});
