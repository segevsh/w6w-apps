import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-get.ts";

Deno.test("domain-get: GETs /v4/domains/{name}", async () => {
  const { ctx, calls } = mockCtx([{ body: { domain: { name: "mg.example.com" } } }]);
  const result = await action.execute!({ name: "mg.example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.mailgun.net/v4/domains/mg.example.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { domain: { name: "mg.example.com" } });
});

Deno.test("domain-get: missing name rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ name: "" }, ctx), Error, "`name`");
});
