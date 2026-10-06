import { assert, assertEquals } from "@std/assert";
import auth, { externalApplication } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { email: "ada@example.com", apiKey: "ck-secret-123" };
const ok = { data: { id: 1, name: "Ada", email: "ada@example.com" } };
const refused = {
  errors: [{ type: "General", message: "Authentication failed", details: null, path: null }],
};

Deno.test("api-key: sign sets the two Clockodo headers and the external-application identifier", () => {
  const req = {
    url: "https://my.clockodo.com/api/v3/customers",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request: req, credential: cred } as never, {} as never) as typeof req;
  assertEquals(out.headers, {
    "x-clockodoapiuser": "ada@example.com",
    "x-clockodoapikey": "ck-secret-123",
    "x-clockodo-external-application": "w6w;ada@example.com",
  });
  assertEquals(externalApplication("a@b.de"), "w6w;a@b.de");
});

Deno.test("api-key: test passes on a data object and probes GET /v4/users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, true);
  assertEquals(calls[0].url, "https://my.clockodo.com/api/v4/users/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-clockodoapikey"], "ck-secret-123");
  assertEquals(calls[0].headers["x-clockodo-external-application"], "w6w;ada@example.com");
});

Deno.test("api-key: a 401 envelope fails with the vendor message, never echoing the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: refused }]);
  const r = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Authentication failed"));
  assert(!JSON.stringify(r).includes("ck-secret-123"));
});

Deno.test("api-key: a 200 that is not the user shape fails, as do 429 and a 500", async () => {
  const a = mockCtx([{ body: "<html>proxy</html>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, a.ctx)).ok, false);
  const b = mockCtx([{ status: 429, body: { errors: [{ type: "Rate", message: "slow" }] } }]);
  const r = await auth.test!({ credential: cred } as never, b.ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rate limited"));
  const c = mockCtx([{ status: 500, body: { errors: [{ message: "boom" }] } }]);
  const r2 = await auth.test!({ credential: cred } as never, c.ctx);
  assert(r2.message?.includes("500") && r2.message.includes("boom"));
});

Deno.test("api-key: missing fields and an unreachable host both fail", async () => {
  assertEquals(
    (await auth.test!({ credential: { apiKey: "k" } } as never, mockCtx().ctx)).ok,
    false,
  );
  assertEquals(
    (await auth.test!({ credential: { email: "a@b.de" } } as never, mockCtx().ctx)).ok,
    false,
  );
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} };
  const r = await auth.test!({ credential: cred } as never, ctx as never);
  assertEquals(r.ok, false);
  assert(r.message?.includes("boom"));
});
