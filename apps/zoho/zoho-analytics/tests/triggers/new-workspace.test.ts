import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockAnalyticsCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-workspace.ts";

test("new-workspace seeds, emits additions, retries, and calls the literal list endpoint", async () => {
  const seededCtx = mockAnalyticsCtx([{
    body: { status: "success", data: { workspaces: [{ workspaceId: "a" }] } },
  }]);
  const seeded = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: {} },
    seededCtx.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seededCtx.calls[0].url).pathname, "/restapi/v2/workspaces/owned");
  const body = {
    status: "success",
    data: { workspaces: [{ workspaceId: "b" }, { workspaceId: "a" }] },
  };
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockAnalyticsCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockAnalyticsCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [{ workspaceId: "b" }]);
  assertEquals(retry, first);
});
