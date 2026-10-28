import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-task-lists.ts";

Deno.test("list-task-lists: hits /tasks/v1/users/@me/lists with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { kind: "tasks#taskLists", items: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "tasks.googleapis.com");
  assertEquals(url.pathname, "/tasks/v1/users/@me/lists");
  assertEquals(calls[0].method, "GET");
  // No defaults are invented client-side; Google's own defaults apply.
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-task-lists: forwards maxResults and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ maxResults: 50, pageToken: "tok" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("maxResults"), "50");
  assertEquals(params.get("pageToken"), "tok");
});

Deno.test("list-task-lists: returns the parsed page", async () => {
  const body = { kind: "tasks#taskLists", items: [{ id: "L1" }], nextPageToken: "n" };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
