import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import listProperties from "../../actions/list-properties.ts";

Deno.test("list-properties: GETs /v2/properties with the documented paging and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 1, items: [{ id: 7 }] } }]);
  const out = await listProperties.execute({
    page: 2,
    size: 25,
    updatedSince: "2026-01-01T00:00:00Z",
    includeCount: true,
    includeInOut: true,
    websiteId: 9,
  }, ctx) as { count: number; items: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/properties");
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    size: "25",
    updatedSince: "2026-01-01T00:00:00Z",
    includeCount: "true",
    includeInOut: "true",
    wid: "9",
  });
  assertEquals(out.items.length, 1);
});

Deno.test("list-properties: sends no query when nothing is set, and never an auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listProperties.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.lodgify.com/v2/properties");
  assertEquals(calls[0].headers["x-apikey"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});
