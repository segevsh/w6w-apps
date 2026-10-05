import { assertEquals, assertRejects } from "@std/assert";
import actionItemComplete from "../../actions/action-item-complete.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("action-item-complete: POST /api/v1/action_item/a1/complete on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { action_item: { id: "a1", text: "Ship", status: "Done" } },
  }]);
  const out = await actionItemComplete.execute({ actionItemId: "a1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/action_item/a1/complete");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), { completed: true });
  assertEquals((out as { status: string }).status, "Done");
});

Deno.test("action-item-complete: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(actionItemComplete.execute({ actionItemId: "a1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
