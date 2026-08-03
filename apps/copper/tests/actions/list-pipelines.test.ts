import { assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import action from "../../actions/list-pipelines.ts";

Deno.test("list-pipelines: GETs /pipelines — metadata endpoints are not search endpoints", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: 213214, name: "Sales", stages: [{ id: 987790, name: "Qualified" }] }],
  }]);
  const out = await run<{ pipelines: unknown[] }>(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/pipelines");
  assertEquals(calls[0].body, null);
  assertEquals(out.pipelines, [
    { id: 213214, name: "Sales", stages: [{ id: 987790, name: "Qualified" }] },
  ]);
});

Deno.test("list-pipelines: an empty body yields an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals((await run<{ pipelines: unknown[] }>(action, {}, ctx)).pipelines, []);
});

Deno.test("list-pipelines: is a parameterless search action", () => {
  assertEquals(action.type, "search");
  assertEquals(action.params, []);
});
