import { assertEquals } from "@std/assert";
import map from "../../actions/map.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("map: POSTs to /map and returns the links array, unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { success: true, links: [{ url: "https://example.com/a" }] },
  }]);
  const out = await map.execute({ url: "https://example.com" }, ctx) as { links: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/map");
  assertEquals(out.links, [{ url: "https://example.com/a" }]);
});

Deno.test("map: an empty links array does not crash — returns []", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: true } }]);
  const out = await map.execute({ url: "https://example.com" }, ctx) as { links: unknown[] };
  assertEquals(out.links, []);
});

Deno.test("map: type is search, and prefills a limit far below the vendor's 5000/100000", () => {
  assertEquals(map.type, "search");
  const p = map.params?.find((p) => p.key === "limit");
  assertEquals(p?.default, 500);
});
