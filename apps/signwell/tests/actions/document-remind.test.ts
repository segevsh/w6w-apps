import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-remind.ts";

Deno.test("document-remind: POSTs the recipients to remind", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1", status: "Sent" } }]);
  const out = await action.execute!({ id: "d1", recipients: '[{"email":"a@b.test"}]' }, ctx);
  assertEquals(out, { id: "d1", status: "Sent" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents/d1/remind");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { recipients: [{ email: "a@b.test" }] });
  assertEquals(action.idempotent, false);
});

Deno.test("document-remind: with no recipients it reminds everyone (empty body)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1" } }]);
  await action.execute!({ id: "d1" }, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("document-remind: a 422 about the document status surfaces", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: { document: "The document is in a status that cannot be reminded" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "d1" }, ctx),
    Error,
    "cannot be reminded",
  );
});
