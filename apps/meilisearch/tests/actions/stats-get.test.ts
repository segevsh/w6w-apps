import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/stats-get.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

Deno.test("stats-get: reads instance-wide stats and takes no parameters", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { databaseSize: 1024, indexes: {} } }],
    conn,
  );
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/stats");
  assertEquals(result.databaseSize, 1024);
  assertEquals(action.params, []);
});
