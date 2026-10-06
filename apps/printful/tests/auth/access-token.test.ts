import { assert, assertEquals } from "@std/assert";
import auth, { probeRequest } from "../../auth/access-token.ts";
import { mockCtx } from "../_helpers.ts";

const sign = async (credential: unknown, url = "https://api.printful.com/orders") => {
  const { ctx } = mockCtx();
  return (await auth.sign!({ request: { url, method: "GET", headers: {} }, credential }, ctx))
    .headers;
};

Deno.test("sign: bearer token, trimmed, no store header by default", async () => {
  assertEquals(await sign({ accessToken: " tok " }), { authorization: "Bearer tok" });
});

Deno.test("sign: the store id is stamped on store-scoped calls but not on /stores", async () => {
  const cred = { accessToken: "tok", storeId: " 77 " };
  assertEquals((await sign(cred))["x-pf-store-id"], "77");
  assertEquals((await sign(cred, "https://api.printful.com/stores"))["x-pf-store-id"], undefined);
  assertEquals(
    (await sign(cred, "https://api.printful.com/stores/77"))["x-pf-store-id"],
    undefined,
  );
});

Deno.test("test: a store list is ok and the probe is signed", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200, result: [{ id: 1, name: "S" }] } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "t" } }, ctx), { ok: true });
  assertEquals(calls[0].url, probeRequest().url);
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("test: a 200 without a store list is not ok", async () => {
  const { ctx } = mockCtx([{ body: { code: 200, result: {} } }]);
  const r = await auth.test!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("test: rejection is read from error.reason, whatever the status", async () => {
  for (const status of [401, 400]) {
    const { ctx } = mockCtx([{
      status,
      body: {
        code: 401,
        result: "x",
        error: { reason: "Unauthorized", message: "The access token provided is invalid." },
      },
    }]);
    const r = await auth.test!({ credential: { accessToken: "bad" } }, ctx);
    assertEquals(r.ok, false);
    assert(r.message!.includes("rejected the token"), r.message);
  }
});

Deno.test("test: missing token, 429, 5xx, other and network failures", async () => {
  assertEquals((await auth.test!({ credential: {} }, mockCtx().ctx)).ok, false);
  const r429 = await auth.test!(
    { credential: { accessToken: "t" } },
    mockCtx([{ status: 429, body: {} }]).ctx,
  );
  assert(r429.message!.includes("rate-limited"));
  const r500 = await auth.test!(
    { credential: { accessToken: "t" } },
    mockCtx([{ status: 503, body: {} }]).ctx,
  );
  assert(r500.message!.includes("erroring"));
  const r403 = await auth.test!(
    { credential: { accessToken: "t" } },
    mockCtx([{
      status: 403,
      body: { error: { reason: "Forbidden", message: "scope" } },
    }]).ctx,
  );
  assert(r403.message!.includes("Forbidden: scope"), r403.message);
  const net = await auth.test!({ credential: { accessToken: "t" } }, mockCtx([]).ctx);
  assert(net.message!.includes("could not reach"));
});

Deno.test("afterConnect: labels the connection with the first store name", async () => {
  const { ctx } = mockCtx([{ body: { code: 200, result: [{ id: 1, name: "Merch" }] } }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx), {
    store: "Merch",
  });
  const { ctx: bad } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "t" } }, bad), {
    store: "Printful",
  });
});
