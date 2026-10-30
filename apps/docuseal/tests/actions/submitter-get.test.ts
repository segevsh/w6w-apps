import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submitter-get.ts";

test("submitter-get: reads one submitter by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, status: "sent" } }]);
  assertEquals(await action.execute!({ id: 7 }, ctx), { id: 7, status: "sent" });
  assertEquals(calls[0].url, "https://api.docuseal.com/submitters/7");
  assertEquals(calls[0].method, "GET");
});
