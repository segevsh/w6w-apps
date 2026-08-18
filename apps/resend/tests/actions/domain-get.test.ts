import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-get.ts";

Deno.test("domain-get: fetches one domain", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "d_1" } }], { display: {} });
  await action.execute!({ domainId: "d_1" }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/domains/d_1");
});

Deno.test("domain-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`domainId`");
  assertEquals(calls.length, 0);
});
