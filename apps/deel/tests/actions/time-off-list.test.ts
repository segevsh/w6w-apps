import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-list.ts";

/** Deel scopes time off to a profile — there is no flat org-wide list. */
Deno.test("time-off-list: reads one profile's requests, offset-paginated", async () => {
  // `total_rows` is what lets the offset pager stop on the first page; without
  // it, it must ask once more to learn there is nothing left.
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "t1" }], page: { total_rows: 1 } },
  }], { display: {} });
  const result = await action.execute!({ hrisProfileId: "hp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/time_offs/profile/hp1");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(result, [{ id: "t1" }]);
});

Deno.test("time-off-list: a blank profile fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`hrisProfileId`");
  assertEquals(calls.length, 0);
});
