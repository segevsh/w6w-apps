import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/org-get.ts";

Deno.test("org-get: reads the organization structure", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { orgType: 1, enterpriseInfo: { offices: [] } },
  }]);
  const result = await action.execute!({}, ctx) as { orgType: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/org");
  assertEquals(result.orgType, 1);
});

Deno.test("org-get: declares no params", () => {
  assertEquals(action.params, []);
});
