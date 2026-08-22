import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-list.ts";

const page = {
  status: 200,
  body: {
    data: [
      { id: "run-3", attributes: { status: "planned", message: "third" } },
      { id: "run-2", attributes: { status: "planned", message: "second" } },
      { id: "run-1", attributes: { status: "applied", message: "first" } },
    ],
    meta: { pagination: { "current-page": 1, "next-page": null, "total-count": 3 } },
  },
};

Deno.test("run-list: lists a workspace's runs", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/workspaces/ws-1/runs");
  assertEquals(result.count, 3);
  assertEquals(result.ids, ["run-3", "run-2", "run-1"]);
  assertEquals(result.totalCount, 3);
  assertEquals(result.nextPage, undefined);
});

/** A run in `planned` holds the queue and every new run sits behind it. */
Deno.test("run-list: counts the runs waiting for a person, and warns", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.awaitingCount, 2);
  assertEquals(logs[0].level, "warn");
  assert(/holding the queue/.test(logs[0].message), logs[0].message);
});

Deno.test("run-list: nothing waiting means no warning", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { data: [{ id: "run-1", attributes: { status: "applied" } }] },
  }]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals(result.awaitingCount, 0);
  assertEquals(logs.length, 0);
});

/** The status filter takes the API's snake_case names, not the kebab-case ones. */
Deno.test("run-list: sends the bracketed filters", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({
    workspaceId: "ws-1",
    status: "planned, errored",
    operation: "destroy",
    pageSize: 5,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[status]"), "planned,errored");
  assertEquals(url.searchParams.get("filter[operation]"), "destroy");
  assertEquals(url.searchParams.get("page[size]"), "5");
});

Deno.test("run-list: the status hint warns about the two casings in one response", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assert(/snake_case while the attributes/.test(status.hint!), status.hint);
});

Deno.test("run-list: newest first, so the latest run is the first one", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ workspaceId: "ws-1" }, ctx) as Record<string, unknown>;
  assertEquals((result.latest as Record<string, unknown>).id, "run-3");
});

Deno.test("run-list: a workspace named by organisation is resolved first", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "ws-7", attributes: { name: "prod" } } } },
    page,
  ]);
  await action.execute({ organization: "acme", workspace: "prod" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/workspaces/ws-7/runs");
});
