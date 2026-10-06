import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-customer.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("delete-customer: DELETEs /v3/customers/{id} with dry_run and force", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await exec(action, { id: 4, dryRun: true, force: false }, ctx), { success: true });
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/customers/4");
  assertEquals(url.searchParams.get("dry_run"), "true");
  assertEquals(url.searchParams.get("force"), "false");
});

Deno.test("delete-customer: a 422 refusal surfaces and a bad id is refused locally", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ type: "Dependent", message: "still has entries" }] },
  }]);
  await assertRejects(() => exec(action, { id: 4 }, ctx), Error, "still has entries");
  await assertRejects(() => exec(action, { id: "x" }, mockCtx().ctx), Error, "positive integer");
});
