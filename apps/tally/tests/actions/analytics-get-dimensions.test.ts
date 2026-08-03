import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/analytics-get-dimensions.ts";

Deno.test("analytics-get-dimensions: GETs the audience breakdowns", async () => {
  const dimensions = {
    source: { google: 10 },
    browser: { Chrome: 8 },
    os: { macOS: 5 },
    device: { desktop: 9 },
    country: { BE: 7 },
    city: { Brussels: 3 },
  };
  const { ctx, calls } = mockCtx([{ body: dimensions }]);
  const result = await action.execute({ formId: "f1", period: "30d" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/analytics/dimensions");
  assertEquals(result.country, { BE: 7 });
  // The whole object rides along, so a dimension Tally adds later still arrives.
  assertEquals(result.dimensions, dimensions);
});
