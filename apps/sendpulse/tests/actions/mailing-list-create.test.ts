import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mailing-list-create.ts";

test("mailing-list-create: POSTs to the host root, not /crm/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  const result = await action.execute!({ bookName: "Newsletter" }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/addressbooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), { bookName: "Newsletter" });
  assertEquals(result, { id: 42 });
});
