import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-update-recipients.ts";

Deno.test("document-update-recipients: PATCHes /documents/{id}/recipients", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "d1", recipients: [{ id: "r1", name: "B", email: "b@b.test" }] },
  }]);
  const out = await action.execute!({
    id: "d1",
    recipients: [{ id: "r1", name: "B", email: "b@b.test" }],
  }, ctx);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents/d1/recipients");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    recipients: [{ id: "r1", name: "B", email: "b@b.test" }],
  });
  assertEquals((out as { id: string }).id, "d1");
  assertEquals(action.idempotent, true);
});

Deno.test("document-update-recipients: recipients are required, and a 409 surfaces", async () => {
  const { ctx, calls } = mockCtx([{
    status: 409,
    body: { message: "Conflict", meta: { error: "conflict" } },
  }]);
  await assertRejects(async () => await action.execute!({ id: "d1" }, ctx), Error, "`recipients`");
  assertEquals(calls.length, 0);
  await assertRejects(
    async () => await action.execute!({ id: "d1", recipients: [] }, ctx),
    Error,
    "409",
  );
});
