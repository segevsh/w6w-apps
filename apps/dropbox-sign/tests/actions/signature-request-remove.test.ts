import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-remove.ts";

/** Removing access is irreversible, so a blank field must not reach the wire. */
Deno.test("remove: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ signatureRequestId: "sr1" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("remove: with confirmation it POSTs the remove path", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ signatureRequestId: "sr1", confirm: true }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/remove/sr1");
  assertEquals(result, { signature_request_id: "sr1", removed: true });
  // Destructive enough to log at warn, not info.
  assertEquals(logs[0].level, "warn");
});

Deno.test("remove: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`signatureRequestId`",
  );
  assertEquals(calls.length, 0);
});
