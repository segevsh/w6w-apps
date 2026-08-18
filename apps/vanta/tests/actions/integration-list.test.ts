import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/integration-list.ts";

Deno.test("integration-list: reads what feeds Vanta its evidence", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "aws" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/integrations");
  assertEquals(result.count, 1);
});

/**
 * A disconnected integration does not fail its tests — they go stale and stay
 * green.
 */
Deno.test("integration-list: says why a green dashboard can be wrong", () => {
  assert(/go stale and stay green/.test(action.description!), action.description);
});
