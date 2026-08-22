import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-audit-log.ts";

const conn = { display: {} };

/** The audit trail is what makes a signature defensible. */
Deno.test("envelope-audit-log: reads the paged audit trail", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: [{ type: "DOCUMENT_OPENED" }] } }],
    conn,
  );
  assertEquals(await action.execute!({ envelopeId: "e1" }, ctx), [{ type: "DOCUMENT_OPENED" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/envelope/e1/audit-log");
  assert(action.description!.includes("evidence"), action.description);
});

Deno.test("envelope-audit-log: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
});
