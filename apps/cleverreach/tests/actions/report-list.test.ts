import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/report-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("report-list: calls GET /v3/reports with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "r1" }] }]);
  const out = await action.execute({
    pageSize: 20,
    page: 2,
    channelId: "c1",
    groupId: "5",
    start: 1700000000,
    end: "1790000000",
    mode: "basic",
  }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v3/reports");
  assertEquals(queryOf(calls[0].url), {
    pagesize: "20",
    page: "2",
    channel_id: "c1",
    start: "1700000000",
    end: "1790000000",
    group_id: "5",
    mode: "basic",
  });
  assertEquals(out.count, 1);
});

Deno.test("report-list: refuses a lone start or end", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ start: 1700000000 }, ctx),
    Error,
    "must be given together",
  );
  await assertRejects(
    async () => await action.execute({ end: 1700000000 }, ctx),
    Error,
    "must be given together",
  );
  assertEquals(calls.length, 0);
});
