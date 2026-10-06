import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/chart-validate.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("chart-validate: a good config reports valid with normalized params and warnings", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      errors: [],
      warnings: ["v3 options with v2"],
      normalized: { width: 500, authenticated: false },
      renderCheck: { contentType: "image/png", bytes: 100 },
    },
  }]);
  const out = await exec(action, { chart: '{"type":"bar"}' }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/api/validate-chart");
  assertEquals(out.valid, true);
  assertEquals(out.warnings, ["v3 options with v2"]);
  assertEquals(out.renderCheck, { contentType: "image/png", bytes: 100 });
});

Deno.test("chart-validate: a 400 is returned as data, not thrown", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { success: false, errors: ["Chart error: Invalid input"], warnings: [], normalized: {} },
  }]);
  const out = await exec(action, { chart: "{bad" }, ctx);
  assertEquals(out.valid, false);
  assertEquals(out.errors, ["Chart error: Invalid input"]);
});

Deno.test("chart-validate: 429 still throws", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "slow" }]);
  await assertRejects(() => exec(action, { chart: "{}" }, ctx), Error, "429");
});
