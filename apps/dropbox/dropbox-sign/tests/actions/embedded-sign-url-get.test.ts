import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embedded-sign-url-get.ts";

/** The id is the signer's signature_id, not the request's. */
Deno.test("sign-url: GETs by signature id and unwraps the embedded envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { embedded: { sign_url: "https://app.hellosign.com/e/x", expires_at: 1 } },
  }]);
  const result = await action.execute!({ signatureId: "sg1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/embedded/sign_url/sg1");
  assertEquals(result.sign_url, "https://app.hellosign.com/e/x");
  const hint = (action.params as Array<{ key: string; hint?: string }>)[0].hint!;
  assert(hint.includes("SIGNER's id"), hint);
});

Deno.test("sign-url: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`signatureId`");
  assertEquals(calls.length, 0);
});
