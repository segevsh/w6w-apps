import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-linked-resources.ts";

Deno.test("list-linked-resources: hits the task's linkedResources collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L1/tasks/T1/linkedResources",
  );
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("list-linked-resources: replays a nextLink verbatim", async () => {
  const link =
    "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks/T1/linkedResources?$skiptoken=q";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", task: "T1", nextLink: link }, ctx);
  assertEquals(calls[0].url, link);
});
