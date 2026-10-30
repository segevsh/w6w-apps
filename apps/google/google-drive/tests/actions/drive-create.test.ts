import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/drive-create.ts";

test("drive-create: POSTs /drives with body and requestId query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "drv-1", name: "Team" } }]);
  await action.execute!({ name: "Team" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/drive/v3/drives");
  // Google demands a client-generated requestId for idempotency.
  const requestId = url.searchParams.get("requestId");
  assertEquals(typeof requestId, "string");
  assertEquals(requestId!.length > 0, true);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.name, "Team");
});
