import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-task-lists.ts";

Deno.test("list-task-lists: hits /v1.0/me/todo/lists and invents no defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "graph.microsoft.com");
  assertEquals(url.pathname, "/v1.0/me/todo/lists");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-task-lists: forwards $select and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ select: ["id", "displayName"], top: 25 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("$select"), "id,displayName");
  assertEquals(p.get("$top"), "25");
});

Deno.test("list-task-lists: a nextLink is replayed verbatim, without re-adding params", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/todo/lists?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ nextLink: link, select: ["id"], top: 5 }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-task-lists: `all` walks pages up to maxPages", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p2" } },
    { body: { value: [{ id: "2" }] } },
  ]);
  const out = await action.execute!({ all: true, maxPages: 5 }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.pages, 2);
  assertEquals(out.value.length, 2);
});

Deno.test("list-task-lists: is a read with a paged output contract", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "task-list");
  assert(action.params!.every((p) => !p.required));
  assertEquals((action.output as { key: string }[]).map((o) => o.key), [
    "value",
    "nextLink",
    "pages",
  ]);
});
