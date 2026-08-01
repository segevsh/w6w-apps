import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/set.ts";

Deno.test("set: POSTs /set/{key}/{value} without a TTL", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: "OK" } }]);
  assertEquals(await action.execute({ key: "k", value: "v" }, ctx), { result: "OK" });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/set/k/v");
});

Deno.test("set: appends EX/{ttlSeconds} when a TTL is given", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: "OK" } }]);
  await action.execute({ key: "k", value: "v", ttlSeconds: 100 }, ctx);
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/set/k/v/EX/100");
});
