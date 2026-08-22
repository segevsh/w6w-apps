import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-get.ts";

Deno.test("audience-get: fetches one audience", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a_1" } }], { display: {} });
  await action.execute!({ audienceId: "a_1" }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/audiences/a_1");
});

Deno.test("audience-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`audienceId`");
  assertEquals(calls.length, 0);
});
