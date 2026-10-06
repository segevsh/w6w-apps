import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-opens-analytics.ts";
import { exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-opens-analytics: routes each breakdown to its endpoint", async () => {
  for (const b of ["country", "ua-name", "ua-type"]) {
    const resp = { data: { stats: [{ name: "US", count: 4 }] } };
    const { ctx, calls } = mockCtx([{ body: resp }]);
    const out = await exec(
      action,
      { breakdown: b, dateFrom: 100, dateTo: 200, domainId: "d1" },
      ctx,
    );
    assertEquals(pathOf(calls[0].url), `/v1/analytics/${b}`);
    assertEquals(queryOf(calls[0].url), { domain_id: "d1", date_from: "100", date_to: "200" });
    assertEquals(out, resp);
  }
});

Deno.test("get-opens-analytics: an unknown breakdown is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        exec(action, { breakdown: "../x", dateFrom: 1, dateTo: 2 }, ctx)
      ),
    Error,
    "unknown breakdown",
  );
  assertEquals(calls.length, 0);
});
