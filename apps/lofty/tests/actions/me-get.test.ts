import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/me-get.ts";

Deno.test("me-get: reads the whoami and returns the profile", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 11, teamId: 12345, roleName: "Agent", assignedLeadCount: 42 },
  }]);
  const result = await action.execute!({}, ctx) as { teamId: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/me");
  assertEquals(result.teamId, 12345);
});

Deno.test("me-get: declares no params", () => {
  assertEquals(action.params, []);
});
