import { assertEquals } from "@std/assert";
import accessToken from "../auth/access-token.ts";
import oauth2 from "../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "./_helpers.ts";

const req = () => ({
  url: "https://api.loyverse.com/v1.0/items",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("access-token: sign stamps the bearer header", async () => {
  const out = await accessToken.sign!(
    { request: req(), credential: { accessToken: "tok" } } as never,
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test probes GET /v1.0/merchant and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m", business_name: "Cafe" } }]);
  const out = await accessToken.test({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1.0/merchant");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test classifies by vendor error code, not status", async () => {
  const bad = mockCtx([{
    status: 401,
    body: errorBody("UNAUTHORIZED", "Access token is not valid."),
  }]);
  const r1 = await accessToken.test({ credential: { accessToken: "x" } } as never, bad.ctx);
  assertEquals(r1.ok, false);
  assertEquals(r1.message?.includes("rejected the token"), true);

  const lapsed = mockCtx([{ status: 402, body: errorBody("PAYMENT_REQUIRED", "lapsed") }]);
  const r2 = await accessToken.test({ credential: { accessToken: "x" } } as never, lapsed.ctx);
  assertEquals(r2.message?.includes("subscription"), true);

  const forbidden = mockCtx([{ status: 403, body: errorBody("FORBIDDEN", "no") }]);
  const r3 = await accessToken.test({ credential: { accessToken: "x" } } as never, forbidden.ctx);
  assertEquals(r3.message?.includes("MERCHANT_READ"), true);

  const other = mockCtx([{ status: 500, body: "oops" }]);
  const r4 = await accessToken.test({ credential: { accessToken: "x" } } as never, other.ctx);
  assertEquals(r4.message?.includes("500"), true);
});

Deno.test("access-token: test fails without calling the network when the token is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await accessToken.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: afterConnect keeps only business name and merchant id", async () => {
  const { ctx } = mockCtx([{
    body: { id: "m1", business_name: "Cafe", email: "owner@example.com" },
  }]);
  const out = await accessToken.afterConnect!({ credential: { accessToken: "t" } } as never, ctx);
  assertEquals(out, { businessName: "Cafe", merchantId: "m1" });
  const fail = mockCtx([{ status: 500, body: "x" }]);
  assertEquals(
    await accessToken.afterConnect!({ credential: { accessToken: "t" } } as never, fail.ctx),
    {},
  );
});

Deno.test("oauth2: declares the verified endpoints and scopes", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.loyverse.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.loyverse.com/oauth/token");
  assertEquals(oauth2.oauth2?.scopes?.includes("MERCHANT_READ"), true);
});

Deno.test("oauth2: sign, test and afterConnect", async () => {
  const out = await oauth2.sign!(
    { request: req(), credential: { accessToken: "o" } } as never,
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer o");

  const ok = mockCtx([{ body: { business_name: "Cafe" } }]);
  assertEquals(await oauth2.test({ credential: { accessToken: "o" } } as never, ok.ctx), {
    ok: true,
  });
  const bad = mockCtx([{ status: 401, body: errorBody("UNAUTHORIZED", "x") }]);
  assertEquals(
    (await oauth2.test({ credential: { accessToken: "o" } } as never, bad.ctx)).ok,
    false,
  );
  assertEquals((await oauth2.test({ credential: {} } as never, ok.ctx)).ok, false);

  const ac = mockCtx([{ body: { id: "m", business_name: "Cafe" } }]);
  assertEquals(await oauth2.afterConnect!({} as never, ac.ctx), {
    businessName: "Cafe",
    merchantId: "m",
  });
});
