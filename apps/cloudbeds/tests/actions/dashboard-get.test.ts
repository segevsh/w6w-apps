import { assertEquals } from "@std/assert";
import dashboardGet from "../../actions/dashboard-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("dashboard-get: GET /getDashboard with propertyID and date", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ occupancy: 0.8 }) }]);
  await dashboardGet.execute({ propertyID: "1", date: "2026-09-22" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1.3/getDashboard");
  assertEquals(queryOf(calls[0].url), { propertyID: "1", date: "2026-09-22" });
});

Deno.test("dashboard-get: both params are optional", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await dashboardGet.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
