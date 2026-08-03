import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-task-changes.ts";

Deno.test("list-task-changes: opens a round at the list's tasks/delta", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L=1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L%3D1/tasks/delta");
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("list-task-changes: forwards the OData params the delta function documents", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({
    taskList: "L1",
    filter: "receivedDateTime gt 2026-08-01T00:00:00Z",
    orderBy: "receivedDateTime desc",
    select: ["id", "title"],
    expand: ["checklistItems"],
    top: 10,
    maxPageSize: 2,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("$filter"), "receivedDateTime gt 2026-08-01T00:00:00Z");
  assertEquals(p.get("$orderby"), "receivedDateTime desc");
  assertEquals(p.get("$select"), "id,title");
  assertEquals(p.get("$expand"), "checklistItems");
  assertEquals(p.get("$top"), "10");
  assertEquals(calls[0].headers["prefer"], "odata.maxpagesize=2");
});

Deno.test("list-task-changes: a resumed link is replayed with nothing re-added", async () => {
  const delta = "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks/delta?$deltatoken=tok";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", deltaLink: delta, top: 99, maxPageSize: 3 }, ctx);
  assertEquals(calls[0].url, delta);
  assertEquals(calls[0].headers["prefer"], undefined);
});

Deno.test("list-task-changes: nextLink takes precedence over deltaLink mid-round", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks/delta?$skiptoken=s";
  const delta = "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks/delta?$deltatoken=d";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", nextLink: next, deltaLink: delta }, ctx);
  assertEquals(calls[0].url, next);
});
