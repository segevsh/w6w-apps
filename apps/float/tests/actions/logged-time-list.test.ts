import { assertEquals } from "@std/assert";
import loggedTimeList from "../../actions/logged-time-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("logged-time-list - GETs /logged-time", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ logged_time_id: "5e38963be429adc74664c777" }],
      headers: paginationHeaders(),
    },
  ]);
  const out = asListResult(await loggedTimeList.execute({ project_id: 4567 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/logged-time");
  assertEquals(queryOf(calls[0].url).project_id, "4567");
  assertEquals(out.items, [{ logged_time_id: "5e38963be429adc74664c777" }]);
});
