import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-cancel.ts";
import remove from "../../actions/signature-request-remove.ts";

Deno.test("cancel: POSTs the cancel path and reports what it did", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ signatureRequestId: "sr1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/cancel/sr1");
  assertEquals(result, { signature_request_id: "sr1", cancelled: true });
});

/** Cancel stops an incomplete request; remove destroys access to a finished one. */
Deno.test("cancel and remove are not the same endpoint", async () => {
  const c = mockCtx([{ status: 200 }]);
  await action.execute!({ signatureRequestId: "sr1" }, c.ctx);
  const r = mockCtx([{ status: 200 }]);
  await remove.execute!({ signatureRequestId: "sr1", confirm: true }, r.ctx);
  assertEquals(c.calls[0].url.includes("/cancel/"), true);
  assertEquals(r.calls[0].url.includes("/remove/"), true);
});

Deno.test("cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`signatureRequestId`");
  assertEquals(calls.length, 0);
});
