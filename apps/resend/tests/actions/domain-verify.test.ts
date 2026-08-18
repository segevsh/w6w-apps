import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-verify.ts";

/**
 * The call asks Resend to re-check DNS; it does not answer whether that
 * succeeded. The response is `{ object, id }`.
 */
Deno.test("domain-verify: POSTs the re-check and returns Resend's ack", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "domain", id: "d_1" } }], {
    display: {},
  });
  const result = await action.execute!({ domainId: "d_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.resend.com/domains/d_1/verify");
  assertEquals(result, { object: "domain", id: "d_1" });
});

Deno.test("domain-verify: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`domainId`");
  assertEquals(calls.length, 0);
});
