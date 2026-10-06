import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-event-series.ts";

Deno.test("get-event-series: GET /series/{id}/ with expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s" } }]);
  await action.execute!({ eventSeriesId: "s1", expand: "series_dates" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/series/s1/");
  assertEquals(url.searchParams.get("expand"), "series_dates");
});

Deno.test("get-event-series: no expand omits the param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ eventSeriesId: "s1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("expand"));
});
