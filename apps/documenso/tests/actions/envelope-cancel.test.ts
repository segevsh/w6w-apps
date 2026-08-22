import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-cancel.ts";

const conn = { display: {} };

Deno.test("envelope-cancel: POSTs the id and the reason", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "CANCELLED" } }], conn);
  await action.execute!({ envelopeId: "e1", reason: "wrong version" }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/cancel");
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1", reason: "wrong version" });
});

/** The reason is shown to recipients, so an unset one is omitted not blanked. */
Deno.test("envelope-cancel: an unset reason is omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "e1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1" });
});

Deno.test("envelope-cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("the record stays"), action.description);
});
