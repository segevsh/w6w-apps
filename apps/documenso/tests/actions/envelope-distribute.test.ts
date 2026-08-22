import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-distribute.ts";

const conn = { display: {} };

/** Nothing reaches a signer until this call. */
Deno.test("envelope-distribute: POSTs the envelope id and logs at warn", async () => {
  const { ctx, calls, logs } = mockCtx(
    [{ status: 200, body: { id: "e1", status: "PENDING" } }],
    conn,
  );
  await action.execute!({ envelopeId: "e1" }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/distribute");
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1" });
  assertEquals(logs[0].level, "warn");
});

Deno.test("envelope-distribute: the meta object passes through when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "e1", meta: '{"subject":"Please sign"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).meta, { subject: "Please sign" });
});

Deno.test("envelope-distribute: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("Nothing is sent until this runs"), action.description);
});
