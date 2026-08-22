import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-delete.ts";

const conn = { display: {} };

/** For a signed document the audit trail is the evidence. */
Deno.test("envelope-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1" }, ctx),
    Error,
    "destroys its audit trail",
  );
  assertEquals(calls.length, 0);
});

/** Note the verb: a POST, not a DELETE. */
Deno.test("envelope-delete: with confirmation it POSTs the delete path, at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], conn);
  const result = await action.execute!({ envelopeId: "e1", confirm: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/delete");
  assertEquals(result, { envelopeId: "e1", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("envelope-delete: points at cancelling as the option that keeps the record", () => {
  assert(action.description!.includes("Cancelling keeps both"), action.description);
});
