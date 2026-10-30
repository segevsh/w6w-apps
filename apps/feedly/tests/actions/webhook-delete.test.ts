import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs the conventional (no-colon) trigger path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await webhookDelete.execute({ triggerId: "166e676a496:52:8c61af75" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    pathOf(calls[0].url),
    "/v3/enterprise/triggers/166e676a496%3A52%3A8c61af75",
  );
});

test("webhook-delete: is idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
