import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-duplicate.ts";

const conn = { display: {} };

Deno.test("envelope-duplicate: POSTs the envelope id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "e2" } }], conn);
  const result = await action.execute!({ envelopeId: "e1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/duplicate");
  assertEquals(result.id, "e2");
  assertEquals(action.idempotent, false);
});

Deno.test("envelope-duplicate: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
});
