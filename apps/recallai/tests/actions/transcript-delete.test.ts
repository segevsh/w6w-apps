import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcript-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("transcript-delete: DELETEs by id and treats the empty 204 as success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "x1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/transcript/x1/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: "x1" });
});

Deno.test("transcript-delete: a refusal throws with the status and detail", async () => {
  const { ctx } = mockCtx([{ status: 405, body: { detail: 'Method "DELETE" not allowed.' } }]);
  await assertRejects(
    async () => await action.execute!({ id: "x1" }, ctx),
    Error,
    "HTTP 405",
  );
});
