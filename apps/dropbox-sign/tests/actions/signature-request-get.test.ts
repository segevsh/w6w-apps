import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-get.ts";

Deno.test("get: unwraps the signature_request envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { signature_request: { signature_request_id: "sr1", is_complete: false } },
  }]);
  const result = await action.execute!({ signatureRequestId: "sr1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/sr1");
  assertEquals(result.signature_request_id, "sr1");
});

/** is_complete only turns true once EVERY signer has signed. */
Deno.test("get: the output says where per-signer status lives", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "is_complete")!.label.includes("ALL signers"));
  assert(outputs.find((o) => o.key === "signatures")!.label.includes("status_code"));
});

Deno.test("get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`signatureRequestId`");
  assertEquals(calls.length, 0);
});
