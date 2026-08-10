import { assertEquals, assertRejects } from "@std/assert";
import dashboardList from "../../actions/dashboard-list.ts";
import dashboardGet from "../../actions/dashboard-get.ts";
import dashboardCardRun from "../../actions/dashboard-card-run.ts";
import { mockMetabaseCtx, queryOk, SITE_URL } from "../_helpers.ts";

Deno.test("dashboard-list: sends the f filter", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: [] }, { body: [] }]);
  await dashboardList.execute({ f: "mine" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("f"), "mine");

  await dashboardList.execute({}, ctx);
  assertEquals(new URL(calls[1].url).search, "");
});

Deno.test("dashboard-get: fetches one dashboard, which is the only source of dashcards", async () => {
  const { ctx, calls } = mockMetabaseCtx([{
    body: { id: 1, name: "E-commerce Insights", dashcards: [{ id: 1, card_id: 21 }] },
  }]);
  const d = await dashboardGet.execute({ dashboardId: 1 }, ctx) as {
    dashcards: Array<{ id: number; card_id: number }>;
  };
  assertEquals(calls[0].url, `${SITE_URL}/api/dashboard/1`);
  // The two ids differ — this is the pair `dashboard-card-run` needs.
  assertEquals(d.dashcards[0].id, 1);
  assertEquals(d.dashcards[0].card_id, 21);
});

/**
 * Three ids, and `dashcardId` (the placement) is not `cardId` (the question).
 * Verified live: dashcard 1 holds card 21 on the sample dashboard.
 */
Deno.test("dashboard-card-run: builds the three-id path in the right order", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk([[9]])]);
  const r = await dashboardCardRun.execute(
    { dashboardId: 1, dashcardId: 1, cardId: 21 },
    ctx,
  ) as { status: string };
  assertEquals(r.status, "completed");
  assertEquals(calls[0].url, `${SITE_URL}/api/dashboard/1/dashcard/1/card/21/query`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { parameters: [] });
});

Deno.test("dashboard-card-run: distinct ids land in distinct path segments", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk()]);
  await dashboardCardRun.execute({ dashboardId: 3, dashcardId: 7, cardId: 21 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/dashboard/3/dashcard/7/card/21/query");
});

Deno.test("dashboard-card-run: forwards the dashboard's filter values", async () => {
  const params = [{
    type: "date/all-options",
    value: "2026-01",
    target: ["dimension", ["field", 5, null]],
  }];
  const { ctx, calls } = mockMetabaseCtx([queryOk()]);
  await dashboardCardRun.execute(
    { dashboardId: 1, dashcardId: 1, cardId: 21, parameters: params },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).parameters, params);
});

Deno.test("dashboard-card-run: a failed query throws", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 202,
    body: { status: "failed", row_count: 0, error: "permission denied" },
  }]);
  await assertRejects(
    async () => await dashboardCardRun.execute({ dashboardId: 1, dashcardId: 1, cardId: 21 }, ctx),
    Error,
    "query failed",
  );
});
