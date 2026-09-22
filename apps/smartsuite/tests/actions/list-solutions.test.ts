import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-solutions.ts";

Deno.test("list-solutions: GETs /solutions/ and returns the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "sol1", name: "CRM" }] }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/solutions/");
  assertEquals(url.host, "app.smartsuite.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(result, [{ id: "sol1", name: "CRM" }]);
});

Deno.test("list-solutions: coerces a non-array body to an empty array", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  assertEquals(await action.execute!({}, ctx), []);
});
