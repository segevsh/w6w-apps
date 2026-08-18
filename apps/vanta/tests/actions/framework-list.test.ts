import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/framework-list.ts";

Deno.test("framework-list: reads what the tenant is held to", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "soc2", name: "SOC 2" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/frameworks");
  assertEquals(result.count, 1);
});

Deno.test("framework-list: asks for 100 rather than Vanta's default of 10", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "100");
});

/** The same test means different things per certification. */
Deno.test("framework-list: says why it comes first", () => {
  assert(/framework id/.test(action.description!), action.description);
});
