import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-name-to-domain.ts";

Deno.test("company-name-to-domain: GETs company.clearbit.com/v1/domains/find?name=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Clearbit", domain: "clearbit.com" } }]);
  const result = await action.execute!({ name: "Clearbit" }, ctx);
  assertEquals(calls[0].url, "https://company.clearbit.com/v1/domains/find?name=Clearbit");
  assertEquals(result, { name: "Clearbit", domain: "clearbit.com" });
});

Deno.test("company-name-to-domain: requires name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ name: "" }, ctx), Error, "name");
  assertEquals(calls.length, 0);
});
