import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-archives.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-archives: maps every filter to the documented field", async () => {
  const { ctx, calls } = mockCtx([{
    body: { chats: [{ id: "C1" }], found_chats: 9, next_page_id: "N" },
  }]);
  const out = await action.execute({
    query: "refund",
    from: "2026-01-01T00:00:00.000000+00:00",
    to: "2026-02-01T00:00:00.000000+00:00",
    chatIds: "C1,C2",
    groupIds: "0,2",
    customerId: "cust",
    customerEmail: "a@b.co",
    agentIds: "smith@example.com",
    tags: "vip, billing",
    limit: 50,
    sortOrder: "desc",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/list_archives");
  assertEquals(JSON.parse(calls[0].body!), {
    filters: {
      query: "refund",
      from: "2026-01-01T00:00:00.000000+00:00",
      to: "2026-02-01T00:00:00.000000+00:00",
      chat_ids: ["C1", "C2"],
      group_ids: [0, 2],
      customer_id: "cust",
      customer_email: "a@b.co",
      agents: { values: ["smith@example.com"] },
      tags: { values: ["vip", "billing"] },
    },
    limit: 50,
    sort_order: "desc",
  });
  assertEquals(out, {
    chats: [{ id: "C1" }],
    found: 9,
    nextPageId: "N",
    previousPageId: undefined,
  });
});

Deno.test("list-archives: no input sends an empty body; page_id goes alone", async () => {
  const { ctx, calls } = mockCtx([{ body: { chats: [] } }, { body: { chats: [] } }]);
  await action.execute({}, ctx);
  await action.execute({ pageId: "P" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(JSON.parse(calls[1].body!), { page_id: "P" });
});

Deno.test("list-archives: enforces the documented array caps and the page_id rule", async () => {
  const { ctx, calls } = mockCtx([]);
  const many = Array.from({ length: 1001 }, (_, i) => `c${i}`).join(",");
  await assertRejects(
    async () => await action.execute({ chatIds: many }, ctx),
    Error,
    "at most 1000",
  );
  const groups = Array.from({ length: 201 }, (_, i) => i).join(",");
  await assertRejects(
    async () => await action.execute({ groupIds: groups }, ctx),
    Error,
    "at most 200",
  );
  await assertRejects(
    async () => await action.execute({ pageId: "P", query: "x" }, ctx),
    Error,
    "cannot be combined",
  );
  assertEquals(calls.length, 0);
});
