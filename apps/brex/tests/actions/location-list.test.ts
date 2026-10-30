import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import locationList from "../../actions/location-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

const LOCATION = { id: "lc_1", name: "HQ", description: "1 Market St" };

test("location-list: GETs the collection and forwards name, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([LOCATION]) }]);
  await locationList.execute({ name: "HQ", limit: 10, cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/locations");
  assertEquals(queryOf(calls[0].url), { name: "HQ", limit: "10", cursor: "c1" });
});

test("location-list: no filter means no query string at all", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await locationList.execute({}, ctx);

  assertEquals(new URL(calls[0].url).search, "");
});

test("location-list: the page is normalized", async () => {
  const { ctx } = mockCtx([{ body: page([LOCATION], "c2") }]);
  const result = await locationList.execute({}, ctx);

  assertEquals(result, { items: [LOCATION], next_cursor: "c2", count: 1 });
});

test("location-list: it is a search with no required params", () => {
  assertEquals(locationList.type, "search");
  assertEquals(locationList.params?.every((p) => !p.required), true);
});
