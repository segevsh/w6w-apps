import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-journal.ts";

test("get-journal: GETs /journals/{id} and returns its four fields", async () => {
  const journal = { id: 1, code: "VE", label: "Sales", type: "sales" };
  const { ctx, calls } = mockCtx([{ body: journal }]);
  const res = await action.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/journals/1");
  assertEquals(res, journal);
});
