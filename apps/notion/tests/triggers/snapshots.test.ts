import { describe, test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, type MockResponse } from "../_helpers.ts";
import newWorkspaceUser from "../../triggers/new-workspace-user.ts";
import newBlock from "../../triggers/new-block.ts";
import newComment from "../../triggers/new-comment.ts";
import newDataSourceTemplate from "../../triggers/new-data-source-template.ts";
import newView from "../../triggers/new-view.ts";
import newOrUpdatedPlugin from "../../triggers/new-or-updated-plugin.ts";

type Item = Record<string, unknown>;

interface Case {
  trigger: typeof newView;
  params: Record<string, unknown>;
  /** Field of the response that holds the items. */
  field: string;
  method: string;
  path: string;
  /** Literal query string of the first page request. */
  search: string;
  item: (id: string, version?: string) => Item;
  updated?: boolean;
}

const CASES: Case[] = [
  {
    trigger: newWorkspaceUser as never,
    params: {},
    field: "results",
    method: "GET",
    path: "/v1/users",
    search: "page_size=100",
    item: (id) => ({ object: "user", id, type: "person" }),
  },
  {
    trigger: newBlock as never,
    params: { blockId: "page-1" },
    field: "results",
    method: "GET",
    path: "/v1/blocks/page-1/children",
    search: "page_size=100",
    item: (id) => ({ object: "block", id, type: "paragraph" }),
  },
  {
    trigger: newComment as never,
    params: { blockId: "page-1" },
    field: "results",
    method: "GET",
    path: "/v1/comments",
    search: "block_id=page-1&page_size=100",
    item: (id) => ({ object: "comment", id }),
  },
  {
    trigger: newDataSourceTemplate as never,
    params: { dataSourceId: "ds-1" },
    field: "templates",
    method: "GET",
    path: "/v1/data_sources/ds-1/templates",
    search: "page_size=100",
    item: (id) => ({ id, name: "Template", is_default: false }),
  },
  {
    trigger: newView as never,
    params: { databaseId: "db-1" },
    field: "results",
    method: "GET",
    path: "/v1/views",
    search: "database_id=db-1&page_size=100",
    item: (id) => ({ object: "view", id }),
  },
  {
    trigger: newOrUpdatedPlugin as never,
    params: {},
    field: "results",
    method: "GET",
    path: "/v1/ai/plugins",
    search: "page_size=100",
    item: (id, version = "v1") => ({ id, name: id, description: "d", version_id: version }),
    updated: true,
  },
];

const page = (c: Case, items: Item[], next: string | null = null): MockResponse => ({
  body: { object: "list", [c.field]: items, next_cursor: next, has_more: next !== null },
});

for (const c of CASES) {
  describe(c.trigger.key, () => {
    test("declares output, sample and no onSubscribe", () => {
      assert(c.trigger.output.length > 0);
      assert(c.trigger.sample !== undefined);
      assertEquals(typeof c.trigger.poll, "function");
      assertEquals(c.trigger.onSubscribe, undefined);
    });

    test("seeds without emitting and sends the literal request", async () => {
      const m = mockCtx([page(c, [c.item("a"), c.item("b")])]);
      const seeded = await c.trigger.poll!({ state: {}, params: c.params } as never, m.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      const url = new URL(m.calls[0].url);
      assertEquals(m.calls[0].method, c.method);
      assertEquals(url.pathname, c.path);
      assertEquals(url.search.replace(/^\?/, ""), c.search);
    });

    test("emits only the added item and a retry is identical", async () => {
      const seeded = await c.trigger.poll!(
        { state: {}, params: c.params } as never,
        mockCtx([page(c, [c.item("a")])]).ctx,
      );
      const responses = [page(c, [c.item("a"), c.item("b")])];
      const first = await c.trigger.poll!(
        { state: seeded.nextState, params: c.params } as never,
        mockCtx(responses).ctx,
      );
      const retry = await c.trigger.poll!(
        { state: seeded.nextState, params: c.params } as never,
        mockCtx(responses).ctx,
      );
      assertEquals(first.events, [c.item("b")]);
      assertEquals(retry, first);
      const quiet = await c.trigger.poll!(
        { state: first.nextState, params: c.params } as never,
        mockCtx(responses).ctx,
      );
      assertEquals(quiet.events, []);
    });

    test("walks the cursor, so an item on page 2 is seen once", async () => {
      const seeded = await c.trigger.poll!(
        { state: {}, params: c.params } as never,
        mockCtx([page(c, [c.item("a")])]).ctx,
      );
      const m = mockCtx([page(c, [c.item("a")], "cur-2"), page(c, [c.item("z")])]);
      const out = await c.trigger.poll!(
        { state: seeded.nextState, params: c.params } as never,
        m.ctx,
      );
      assertEquals(out.events, [c.item("z")]);
      assertEquals(m.calls.length, 2);
      assert(new URL(m.calls[1].url).searchParams.get("start_cursor") === "cur-2");
    });

    test("a collection larger than the cap fails loudly instead of missing rows", async () => {
      const full = (i: number) => page(c, [c.item(`i${i}`)], `cur-${i + 1}`);
      const m = mockCtx(Array.from({ length: 20 }, (_, i) => full(i)));
      await assertRejects(
        () => c.trigger.poll!({ state: {}, params: c.params } as never, m.ctx),
        Error,
        "more than 2000 rows",
      );
      assertEquals(m.calls.length, 20);
    });

    if (c.updated) {
      test("a changed version of a known item is emitted again", async () => {
        const seeded = await c.trigger.poll!(
          { state: {}, params: c.params } as never,
          mockCtx([page(c, [c.item("a", "v1")])]).ctx,
        );
        const out = await c.trigger.poll!(
          { state: seeded.nextState, params: c.params } as never,
          mockCtx([page(c, [c.item("a", "v2")])]).ctx,
        );
        assertEquals(out.events, [c.item("a", "v2")]);
      });
    } else {
      test("an edit to a known item does not fire (new items only)", async () => {
        const seeded = await c.trigger.poll!(
          { state: {}, params: c.params } as never,
          mockCtx([page(c, [{ ...c.item("a"), extra: 1 }])]).ctx,
        );
        const out = await c.trigger.poll!(
          { state: seeded.nextState, params: c.params } as never,
          mockCtx([page(c, [{ ...c.item("a"), extra: 2 }])]).ctx,
        );
        assertEquals(out.events, []);
      });
    }
  });
}
