import { assertEquals } from "@std/assert";
import publicationList from "../../actions/publication-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("publication-list: fetches GET /publications with the given filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "pub_1", name: "Acme" }], page: 1, limit: 10, total_results: 1 },
  }]);

  const out = await publicationList.execute(
    { expand: "stats", limit: 25, page: 2, orderBy: "name", direction: "desc" },
    ctx,
  ) as { data: Array<{ id: string }> };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications");
  assertEquals(url.searchParams.get("expand"), "stats");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("order_by"), "name");
  assertEquals(url.searchParams.get("direction"), "desc");
  assertEquals(out.data[0].id, "pub_1");
});

Deno.test("publication-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await publicationList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("publication-list: is a read action", () => {
  assertEquals(publicationList.type, "read");
});
