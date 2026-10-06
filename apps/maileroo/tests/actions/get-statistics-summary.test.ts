import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-statistics-summary.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-statistics-summary: maps aggregate and country data", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { aggregate: { delivered: 1200 }, country_data: { US: { opens: 5, clicks: 1 } } },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/statistics/summary");
  assertEquals(out, {
    aggregate: { delivered: 1200 },
    countryData: { US: { opens: 5, clicks: 1 } },
  });
});

Deno.test("get-statistics-summary: a 429 throws with the rate-limit hint", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: { message: "exceeded" } } }]);
  await assertRejects(() => run(action, {}, ctx), Error, "180 requests per minute");
});
