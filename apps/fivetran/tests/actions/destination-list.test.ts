import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/destination-list.ts";

/** A destination with expired credentials breaks every connection at once. */
Deno.test("destination-list: separates the destinations that are not connected", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "d1", service: "snowflake", setup_status: "connected" },
    { id: "d2", service: "big_query", setup_status: "broken" },
  ])]);
  const result = await action.execute!({}, ctx) as { count: number; broken: string[] };
  assertEquals(calls[0].url.split("?")[0], "https://api.fivetran.com/v1/destinations");
  assertEquals(result.count, 2);
  assertEquals(result.broken, ["big_query (d2)"]);
});

Deno.test("destination-list: a destination with no status is not called broken", async () => {
  const { ctx } = mockCtx([page([{ id: "d1", service: "snowflake" }])]);
  const result = await action.execute!({}, ctx) as { broken: string[] };
  assertEquals(result.broken, []);
});

Deno.test("destination-list: says why checking the destination first is worth it", () => {
  assert(/dozen unrelated sources/.test(action.description!), action.description);
});
