import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-release-hold.ts";

Deno.test("release-hold: POSTs the release path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { signature_request: {} } }]);
  await action.execute!({ signatureRequestId: "sr1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/release_hold/sr1");
});

Deno.test("release-hold: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`signatureRequestId`");
  assertEquals(calls.length, 0);
});
