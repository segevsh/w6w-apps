import { assertEquals } from "@std/assert";
import search from "../../actions/search-brands.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("search-brands: encodes the name and shapes the hits", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      {
        brandId: "id_1",
        name: "Nike",
        domain: "nike.com",
        icon: "https://cdn/i.webp",
        claimed: true,
        qualityScore: 0.9,
        verified: true,
        _score: 98,
      },
      { brandId: "id_2", name: null, domain: "nike.org", icon: null },
    ],
  }]);
  const out = await run(search, { name: "Nike Inc" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/search/Nike%20Inc");
  assertEquals(out.count, 2);
  const brands = out.brands as Array<Record<string, unknown>>;
  assertEquals(brands[0].domain, "nike.com");
  assertEquals("_score" in brands[0], false);
  assertEquals(brands[1].name, null);
});

Deno.test("search-brands: a non-array body is zero matches, a 503 throws", async () => {
  const empty = mockCtx([{ body: {} }]);
  assertEquals(await run(search, { name: "x" }, empty.ctx), { count: 0, brands: [] });
  const down = mockCtx([{ status: 503, body: { message: "try later" } }]);
  let threw = false;
  try {
    await run(search, { name: "x" }, down.ctx);
  } catch (e) {
    threw = (e as Error).message.includes("503");
  }
  assertEquals(threw, true);
});
