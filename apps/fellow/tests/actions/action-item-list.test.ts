import { assertEquals, assertRejects } from "@std/assert";
import actionItemList from "../../actions/action-item-list.ts";
import { bodyOf, mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("action-item-list: POST /api/v1/action_items on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { action_items: page([{ id: "a1" }], "nx") },
  }]);
  const out = await actionItemList.execute({
    orderBy: "due_date",
    scope: "assigned_to_me",
    completed: false,
    aiDetected: true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/action_items");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), {
    order_by: "due_date",
    filters: { scope: "assigned_to_me", completed: false, ai_detected: true },
  });
  assertEquals((out as { hasMore: boolean }).hasMore, true);
});

Deno.test("action-item-list: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        actionItemList.execute({
          orderBy: "due_date",
          scope: "assigned_to_me",
          completed: false,
          aiDetected: true,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
