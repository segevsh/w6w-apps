import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-group.ts";

test("update-group: PATCHes only the set fields and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { groupId: "g1", description: "new", securityEnabled: false },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { description: "new", securityEnabled: false });
  assertEquals(out, { updated: true, groupId: "g1" });
});

test("update-group: a 200 body from a Microsoft 365-only property is kept", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "g1", allowExternalSenders: true } }]);
  const out = await action.execute({
    groupId: "g1",
    additionalProperties: { allowExternalSenders: true },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { allowExternalSenders: true });
  assertEquals(out.allowExternalSenders, true);
  assertEquals(out.updated, true);
});

test("update-group: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1" }, ctx),
    Error,
    "at least one property",
  );
  assertEquals(calls.length, 0);
});
