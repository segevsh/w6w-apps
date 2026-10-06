import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GET /3/projects/{projectNumber} with its query", async () => {
  const reply = { "Project": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "projectNumber": "projectNumber-v" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/projects/projectNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
