import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reveal-company-by-ip.ts";

Deno.test("reveal-company-by-ip: GETs reveal.clearbit.com/v1/companies/find?ip=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "company", id: "c1", domain: "google.com" } }]);
  const result = await action.execute!({ ip: "8.8.8.8" }, ctx);
  assertEquals(calls[0].url, "https://reveal.clearbit.com/v1/companies/find?ip=8.8.8.8");
  assertEquals(result, { type: "company", id: "c1", domain: "google.com" });
});

Deno.test("reveal-company-by-ip: requires ip", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ ip: "" }, ctx), Error, "ip");
  assertEquals(calls.length, 0);
});
