import { assertEquals } from "@std/assert";
import reportsList from "../../actions/reports-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reports-list: GETs /v1/company/reports and returns the views array", async () => {
  const { ctx, calls } = mockCtx([{ body: { views: [{ id: 1, name: "Headcount" }] } }]);
  const out = await reportsList.execute({}, ctx) as { views: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/company/reports");
  assertEquals(out.views.length, 1);
});
