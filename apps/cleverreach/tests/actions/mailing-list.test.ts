import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/mailing-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailing-list: calls GET /v3/mailings with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "m1", name: "Spring" }] }]);
  const out = await action.execute({
    state: "finished",
    limit: 50,
    page: 1,
    channelId: "c1",
    start: "2026-01-01T00:00:00Z",
    end: 1790000000,
    omitBody: true,
  }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v3/mailings");
  assertEquals(queryOf(calls[0].url), {
    limit: "50",
    state: "finished",
    channel_id: "c1",
    start: "1767225600",
    end: "1790000000",
    page: "1",
    omit_body: "true",
  });
  assertEquals(out.count, 1);
});

Deno.test("mailing-list: keeps the documented limit ceiling for a non-all state", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ state: "draft", limit: 500 }, ctx),
    Error,
    "at most 100",
  );
  await assertRejects(
    async () => await action.execute({ state: "later" }, ctx),
    Error,
    "`state` must be one of",
  );
  assertEquals(calls.length, 0);
});
