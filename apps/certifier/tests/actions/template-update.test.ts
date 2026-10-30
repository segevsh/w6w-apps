import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/template-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("template-update: PATCH /v1/groups/{id} sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g1" } }]);
  await action.execute({ groupId: "g1", name: "New" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
});

test("template-update: designIds are sent as the replacement list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g1" } }]);
  await action.execute({ groupId: "g1", designIds: "d2,d1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { designIds: ["d2", "d1"] });
});

test("template-update: an empty update is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
