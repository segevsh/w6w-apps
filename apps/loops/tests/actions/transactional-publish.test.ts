import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transactional-publish.ts";

/** The missing step between editing a template and being able to send it. */
Deno.test("transactional-publish: POSTs the publish path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({ transactionalId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/transactional-emails/t1/publish");
  assertEquals(action.idempotent, true);
});

Deno.test("transactional-publish: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`transactionalId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("actually be sent"), action.description);
});
