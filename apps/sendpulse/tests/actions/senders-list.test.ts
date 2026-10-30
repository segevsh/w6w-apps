import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/senders-list.ts";

test("senders-list: GETs /senders", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ email: "a@b.com", name: "Ada" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/senders");
  assertEquals(result, [{ email: "a@b.com", name: "Ada" }]);
});
