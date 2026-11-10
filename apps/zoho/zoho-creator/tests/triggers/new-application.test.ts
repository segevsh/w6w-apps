import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCreatorCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-application.ts";

test("new-application seeds, emits additions, retries, and calls the literal list endpoint", async () => {
  const seedCtx = mockCreatorCtx([{
    body: { code: 3000, applications: [{ workspace_name: "x", link_name: "a" }] },
  }]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seedCtx.calls[0].url).pathname, "/creator/v2/meta/applications");
  const body = {
    code: 3000,
    applications: [{ workspace_name: "x", link_name: "b" }, {
      workspace_name: "x",
      link_name: "a",
    }],
  };
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCreatorCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCreatorCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [{ workspace_name: "x", link_name: "b" }]);
  assertEquals(retry, first);
});
