import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/live-stream-delete.ts";

Deno.test("live-stream-delete: refuses without confirmation, and points at complete", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ liveStreamId: "ls1" }, ctx),
    Error,
  );
  assert(/live-stream-complete/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("live-stream-delete: confirmed, it deletes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ liveStreamId: "ls1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
});

/** Past broadcasts survive as assets. */
Deno.test("live-stream-delete: says the recordings survive", () => {
  assert(/recordings survive/i.test(action.description!), action.description);
});
