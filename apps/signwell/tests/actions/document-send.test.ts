import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-send.ts";

Deno.test("document-send: POSTs only the supplied options to /documents/{id}/send", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1", status: "Sent" } }]);
  const out = await action.execute!({
    id: "d1",
    subject: "Please sign",
    reminders: false,
    expires_in: 7,
    ignored: "x",
  }, ctx);
  assertEquals(out, { id: "d1", status: "Sent" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents/d1/send");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Please sign",
    reminders: false,
    expires_in: 7,
  });
  assertEquals(action.idempotent, false);
});

Deno.test("document-send: with no options the body is an empty object, and id is required", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1" } }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  await action.execute!({ id: "d1" }, ctx);
  assertEquals(calls[0].body, "{}");
});
