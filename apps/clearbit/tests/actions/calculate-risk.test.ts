import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/calculate-risk.ts";

Deno.test("calculate-risk: POSTs risk.clearbit.com/v1/calculate with email and ip", async () => {
  const { ctx, calls } = mockCtx([{ body: { risk: { level: "low", score: 0 } } }]);
  const result = await action.execute!({ email: "alex@clearbit.com", ip: "127.0.0.1" }, ctx);
  assertEquals(calls[0].url, "https://risk.clearbit.com/v1/calculate");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "alex@clearbit.com", ip: "127.0.0.1" });
  assertEquals(result, { risk: { level: "low", score: 0 } });
});

Deno.test("calculate-risk: ip is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ email: "alex@clearbit.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "alex@clearbit.com" });
});

Deno.test("calculate-risk: requires email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ email: "" }, ctx), Error, "email");
  assertEquals(calls.length, 0);
});
