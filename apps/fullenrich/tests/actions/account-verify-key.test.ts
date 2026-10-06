import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/account-verify-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-verify-key: returns the workspace id", async () => {
  const { ctx, calls } = mockCtx([{ body: { workspace_id: "w1" } }]);
  assertEquals(await action.execute!({}, ctx), { workspaceId: "w1" });
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/account/keys/verify");
});

Deno.test("account-verify-key: an unknown key is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "error.api.key", message: "Unknown api key" },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "error.api.key");
});

Deno.test("account-verify-key: a missing workspace_id is null", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({}, ctx), { workspaceId: null });
});
