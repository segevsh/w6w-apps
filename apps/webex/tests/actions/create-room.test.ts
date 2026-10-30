import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-room.ts";

test("create-room: POSTs /rooms with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", title: "Sprint 0" } }]);
  await action.execute({ title: "Sprint 0" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms");
  assertEquals(JSON.parse(calls[0].body!), { title: "Sprint 0" });
});

test("create-room: includes optional fields when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ title: "x", teamId: "t1", isLocked: true, isPublic: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.teamId, "t1");
  assertEquals(body.isLocked, true);
  // isPublic:false survives compact() — only undefined/null/"" are dropped.
  assertEquals(body.isPublic, false);
});

test("create-room: is declared not idempotent", () => {
  assertEquals(action.idempotent, false);
});
