import { assertEquals } from "@std/assert";
import outtoday from "../../actions/timeoff-outtoday.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-outtoday: no params sends no query; filters pass through", async () => {
  const { ctx, calls } = mockCtx([{ body: { outs: [] } }, { body: { outs: [] } }]);
  await outtoday.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/outtoday");
  assertEquals(queryOf(calls[0].url), {});
  await outtoday.execute({ today: "2026-10-06", siteId: 4, includeHourly: true }, ctx);
  assertEquals(queryOf(calls[1].url), { today: "2026-10-06", includeHourly: "true", siteId: "4" });
});
