import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transactional-get.ts";

Deno.test("transactional-get: reads one template by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1", published: false } }]);
  const result = await action.execute!({ transactionalId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/transactional-emails/t1");
  assertEquals(result.published, false);
});

Deno.test("transactional-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`transactionalId`");
  assertEquals(calls.length, 0);
});
