import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-remove-user.ts";

Deno.test("template-remove-user: mirrors add, on its own path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { template: {} } }]);
  await action.execute!({ templateId: "t1", accountId: "a1" }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/template/remove_user/t1");
  assertEquals(JSON.parse(calls[0].body!), { account_id: "a1" });
});

Deno.test("template-remove-user: naming nobody is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ templateId: "t1" }, ctx),
    Error,
    "one of `emailAddress` or `accountId`",
  );
  assertEquals(calls.length, 0);
});
