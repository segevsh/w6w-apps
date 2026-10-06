import { assertEquals } from "@std/assert";
import action from "../../actions/get-account-information.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("get-account-information: GETs /account-information and unwraps response", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, response: { current_plan: "STARTER", remaining_credits: 99 } },
  }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.prospeo.io/account-information");
  assertEquals(calls[0].body, null);
  assertEquals(out, { current_plan: "STARTER", remaining_credits: 99 });
});
