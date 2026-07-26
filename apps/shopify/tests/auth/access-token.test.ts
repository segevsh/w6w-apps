import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects the store handle alongside the token", () => {
  assertEquals(auth.key, "access-token");
  // `custom`, not `bearer`: the Admin API reads its own header.
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["shop", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
});

Deno.test("access-token: sign sets X-Shopify-Access-Token, not Authorization", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.myshopify.com/admin/api/2024-07/shop.json",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "shpat_x" } }, ctx);
  assertEquals(out.headers["x-shopify-access-token"], "shpat_x");
  assertEquals("authorization" in out.headers, false);
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { shop: "acme" } }, ctx), {
    ok: false,
    message: "credential missing shop or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes the store's own host", async () => {
  const ok = mockCtx([{ body: { shop: { id: 1 } } }]);
  assertEquals(await auth.test({ credential: { shop: "acme", accessToken: "t" } }, ok.ctx), {
    ok: true,
  });
  assertEquals(ok.calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/shop.json");
});

Deno.test("access-token: afterConnect records the store handle for the client", async () => {
  const { ctx } = mockCtx([{ body: { shop: { id: 1, name: "Acme Store" } } }]);
  assertEquals(await auth.afterConnect!({ credential: { shop: "acme" } }, ctx), {
    shop: "acme",
    shopInfo: { id: 1, name: "Acme Store" },
  });
});

Deno.test("access-token: afterConnect still records the handle if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  // Without the handle the client could never build a URL for this connection.
  assertEquals(await auth.afterConnect!({ credential: { shop: "acme" } }, ctx), { shop: "acme" });
});
