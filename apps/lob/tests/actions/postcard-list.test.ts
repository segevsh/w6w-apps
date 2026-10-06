import { assertEquals, assertRejects } from "@std/assert";
import postcardList from "../../actions/postcard-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("postcard-list: GETs /postcards and flattens the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{ id: "x_1" }],
      count: 1,
      next_url: "https://api.lob.com/v1/postcards?limit=1&after=CURSOR1",
      previous_url: null,
    },
  }]);
  const out = await postcardList.execute({ limit: 1 }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/postcards");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out.items, [{ id: "x_1" }]);
  assertEquals(out.count, 1);
  assertEquals(out.nextCursor, "CURSOR1");
  assertEquals(out.previousCursor, null);
  assertEquals("totalCount" in out, false);
});

Deno.test("postcard-list: cursor, total count and filters are serialized in Lob's bracket form", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], count: 0, total_count: 7 } }]);
  const out = await postcardList.execute({
    after: "ABC",
    includeTotal: true,
    dateCreated: { gt: "2026-01-01" },
    metadata: '{"campaign":"c1"}',
  }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("after"), "ABC");
  assertEquals(url.searchParams.getAll("include[]"), ["total_count"]);
  assertEquals(url.searchParams.get("date_created[gt]"), "2026-01-01");
  assertEquals(url.searchParams.get("metadata[campaign]"), "c1");
  assertEquals(out.totalCount, 7);
});

Deno.test("postcard-list: refuses both cursors at once", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await postcardList.execute({ after: "a", before: "b" }, ctx),
    Error,
    "only one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("postcard-list: surfaces Lob's error code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_key", "Your API key is not valid.", 401),
  }]);
  await assertRejects(async () => await postcardList.execute({}, ctx), Error, "invalid_api_key");
});
