import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/view-list.ts";

const D = { display: { host: "https://nocodb.internal" } };
const views = {
  status: 200,
  body: {
    list: [
      { id: "v1", title: "All orders", type: 1, is_default: true },
      { id: "v2", title: "Open", type: 1, uuid: "share-abc" },
      { id: "v3", title: "Board", type: 4 },
    ],
  },
};

Deno.test("view-list: names the view types and returns a title lookup", async () => {
  const { ctx, calls } = mockCtx([views], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/meta/tables/mtbl1/views");
  assertEquals(result.byTitle, { "All orders": "v1", Open: "v2", Board: "v3" });
  assertEquals(result.types, { grid: 2, kanban: 1 });
  assertEquals(result.defaultViewId, "v1");
});

/** A shared view serves its rows to anybody with the link. */
Deno.test("view-list: flags shared views and warns", async () => {
  const { ctx, logs } = mockCtx([views], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.sharedViews, ["Open"]);
  assert(
    logs.some((l) => l.level === "warn" && /with no login/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("view-list: no shared views means no warning", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { list: [views.body.list[0]] } }], D);
  await action.execute({ tableId: "mtbl1" }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("view-list: requires a table id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`tableId` is required");
});
