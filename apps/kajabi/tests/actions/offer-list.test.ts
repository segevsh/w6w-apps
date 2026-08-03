import { assertEquals } from "@std/assert";
import offerList from "../../actions/offer-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offer-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "offers") }]);
  await offerList.execute({
    siteId: "111",
    titleContains: "course",
    descriptionContains: "d",
    sort: "-price_in_cents",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/offers");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[title_cont]"], "course");
  assertEquals(q["filter[description_cont]"], "d");
  assertEquals(q["sort"], "-price_in_cents");
});

Deno.test("offer-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "offers") }]);
  await offerList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
