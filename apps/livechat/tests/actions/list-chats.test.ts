import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-chats.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-chats: POSTs list_chats and flattens the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: { chats_summary: [{ id: "C1" }], found_chats: 42, next_page_id: "NEXT" },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/list_chats");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, {
    chats: [{ id: "C1" }],
    found: 42,
    nextPageId: "NEXT",
    previousPageId: undefined,
  });
});

Deno.test("list-chats: builds filters, with group id 0 kept", async () => {
  const { ctx, calls } = mockCtx([{ body: { chats_summary: [] } }]);
  await action.execute({
    state: "active",
    groupIds: "0, 7",
    includeChatsWithoutThreads: false,
    properties: '{"routing":{"pinned":{"values":[true]}}}',
    limit: 25,
    sortOrder: "asc",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    filters: {
      active: true,
      group_ids: [0, 7],
      include_chats_without_threads: false,
      properties: { routing: { pinned: { values: [true] } } },
    },
    limit: 25,
    sort_order: "asc",
  });
});

Deno.test("list-chats: inactive maps to active:false", async () => {
  const { ctx, calls } = mockCtx([{ body: { chats_summary: [] } }]);
  await action.execute({ state: "inactive" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filters: { active: false } });
});

Deno.test("list-chats: a follow-up page sends page_id alone", async () => {
  const { ctx, calls } = mockCtx([{ body: { chats_summary: [] } }]);
  await action.execute({ pageId: "P2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { page_id: "P2" });
});

Deno.test("list-chats: refuses filters alongside page_id and a bad state, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ pageId: "P2", state: "active" }, ctx),
    Error,
    "cannot be combined",
  );
  await assertRejects(
    async () => await action.execute({ state: "x" }, ctx),
    Error,
    "`state` must be one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-chats: surfaces a vendor error", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { type: "authorization", message: "no" } },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "authorization: no");
});
