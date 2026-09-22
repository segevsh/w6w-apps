import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

/** Shapes taken from the `PageV2Response` schema on the Pages v2 reference page. */
const pages = {
  results: [
    { uuid: "p-1", path: "/", title: "Home", type: "REGULAR", draft_status: "DRAFT" },
    {
      uuid: "p-2",
      path: "/staff",
      title: "Staff",
      type: "DYNAMIC",
      collection_name: "Team",
      lang: "en",
    },
    { uuid: "p-3", path: "/book", title: "Book", type: "BOOKING_WIDGET" },
  ],
};

Deno.test("list-pages: GETs the Pages v2 list and returns the results verbatim", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: pages }]);
  const result = await action.execute!({ siteName: "abc1234d" }, ctx) as typeof pages;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/abc1234d/pages");
  assertEquals(result.results.length, 3);
  // A dynamic page names the collection it is bound to; that field is absent on
  // the others, and nothing in the action reshapes the vendor's objects.
  assertEquals(result.results[1].collection_name, "Team");
  assertEquals(result.results[0].collection_name, undefined);
  assertEquals(result.results[2].type, "BOOKING_WIDGET");
});

Deno.test("list-pages: reads v2, never the separately documented v1 surface", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { results: [] } }]);
  await action.execute!({ siteName: "abc" }, ctx);
  assert(!pathOf(calls[0].url).includes("/v1"), pathOf(calls[0].url));
  assertEquals(calls[0].headers["authorization"], undefined);
});
