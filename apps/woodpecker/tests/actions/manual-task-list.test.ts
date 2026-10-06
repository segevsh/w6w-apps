import { assertEquals } from "@std/assert";
import manualTaskList from "../../actions/manual-task-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("manual-task-list: passes the limit", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ "prospect": { "id": 1, "email": "erlich@bachman.com" } }],
  }]);
  const out = await manualTaskList.execute({ "limit": 5 } as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/manual_tasks");
  assertEquals(queryOf(calls[0].url), { "limit": "5" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
});
