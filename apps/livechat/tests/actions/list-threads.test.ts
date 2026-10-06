import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-threads.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-threads: sends chat_id with date filters and paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: { threads: [{ id: "T1" }], found_threads: 1, next_page_id: "N" },
  }]);
  const out = await action.execute({
    chatId: "C1",
    from: "2026-01-01T00:00:00.000000+00:00",
    limit: 10,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/list_threads");
  assertEquals(JSON.parse(calls[0].body!), {
    chat_id: "C1",
    filters: { from: "2026-01-01T00:00:00.000000+00:00" },
    limit: 10,
  });
  assertEquals(out, {
    threads: [{ id: "T1" }],
    found: 1,
    nextPageId: "N",
    previousPageId: undefined,
  });
});

Deno.test("list-threads: a follow-up page keeps chat_id and adds page_id only", async () => {
  const { ctx, calls } = mockCtx([{ body: { threads: [] } }]);
  await action.execute({ chatId: "C1", pageId: "P" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1", page_id: "P" });
});

Deno.test("list-threads: requires chatId and refuses dates with page_id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`chatId` is required");
  await assertRejects(
    async () =>
      await action.execute(
        { chatId: "C", pageId: "P", to: "2026-01-01T00:00:00.000000+00:00" },
        ctx,
      ),
    Error,
    "cannot be combined",
  );
  assertEquals(calls.length, 0);
});
