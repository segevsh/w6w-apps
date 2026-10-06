import { assertEquals, assertRejects } from "@std/assert";
import getBrand from "../../actions/get-brand.ts";
import { mockCtx, run } from "../_helpers.ts";
import { BRAND } from "../_fixtures.ts";

Deno.test("get-brand: path-encodes the identifier and maps the brand", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  const out = await run(getBrand, { identifier: "john@example.brandfetch.com" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/john%40example.brandfetch.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out.found, true);
  assertEquals(out.id, "id_0dwKPKT");
  assertEquals(out.company, { employees: 10001, foundedYear: 1964 });
  // dark-theme logo first, SVG over PNG; icon falls back to the only format.
  assertEquals(out.logoUrl, "https://cdn/logo-dark.svg");
  assertEquals(out.iconUrl, "https://cdn/icon.webp");
});

Deno.test("get-brand: website URL identifiers are encoded whole", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  await run(getBrand, { identifier: "https://www.nike.com/a" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/https%3A%2F%2Fwww.nike.com%2Fa");
});

Deno.test("get-brand: allowNsfw and cachedOnly go on the query only when set", async () => {
  const set = mockCtx([{ body: BRAND }]);
  await run(getBrand, { identifier: "nike.com", allowNsfw: "false", cachedOnly: true }, set.ctx);
  const url = new URL(set.calls[0].url);
  assertEquals(url.searchParams.get("allowNsfw"), "false");
  assertEquals(url.searchParams.get("cachedOnly"), "true");
  const unset = mockCtx([{ body: BRAND }]);
  await run(getBrand, { identifier: "nike.com", cachedOnly: false }, unset.ctx);
  assertEquals(unset.calls[0].url, "https://api.brandfetch.io/v2/brands/nike.com");
});

Deno.test("get-brand: 204 is notIndexed, a crawl_queued 404 is crawlQueued", async () => {
  const none = mockCtx([{ status: 204 }]);
  assertEquals(await run(getBrand, { identifier: "x.com", cachedOnly: true }, none.ctx), {
    found: false,
    notIndexed: true,
  });
  const queued = mockCtx([{
    status: 404,
    headers: { "content-type": "application/json", "x-bf-error": "crawl_queued" },
    body: { message: "Not Found" },
  }]);
  assertEquals(await run(getBrand, { identifier: "x.com" }, queued.ctx), {
    found: false,
    crawlQueued: true,
  });
});

Deno.test("get-brand: a plain 404, 402 and 403 throw with the vendor message and a hint", async () => {
  const nf = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(() => run(getBrand, { identifier: "x" }, nf.ctx), Error, "still consumes");
  const pay = mockCtx([{ status: 402, body: { message: "Payment required." } }]);
  await assertRejects(() => run(getBrand, { identifier: "x" }, pay.ctx), Error, "402");
  const forbidden = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  await assertRejects(
    () => run(getBrand, { identifier: "x" }, forbidden.ctx),
    Error,
    "Forbidden",
  );
});
