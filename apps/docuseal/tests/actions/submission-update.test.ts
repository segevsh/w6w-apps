import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-update.ts";

test("submission-update: sends only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

/** `archived: false` is the documented way back from submission-archive. */
test("submission-update: an explicit false survives", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, archived: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { archived: false });
});
