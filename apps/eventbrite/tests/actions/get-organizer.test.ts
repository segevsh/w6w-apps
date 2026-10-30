import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-organizer.ts";

test("get-organizer: GETs /organizers/{id}/", async () => {
  const body = { id: "orgr-999", name: "Some Org" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ organizerId: "orgr-999" }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizers/orgr-999/");
  assertEquals(url.searchParams.toString(), "");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
