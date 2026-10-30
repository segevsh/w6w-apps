import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-delete.ts";

const display = { site: "acme" };

test("page-delete: trashes by default and reports what it did", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ pageId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages/1");
  assertEquals(new URL(calls[0].url).searchParams.get("purge"), null);
  assertEquals(result, { id: "1", deleted: true, purged: false });
});

test("page-delete: purge is opt-in and surfaces in the result", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ pageId: "1", purge: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("purge"), "true");
  assertEquals((result as Record<string, unknown>).purged, true);
});

test("page-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
