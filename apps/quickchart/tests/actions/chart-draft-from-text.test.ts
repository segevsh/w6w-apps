import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/chart-draft-from-text.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("chart-draft-from-text: POSTs /natural/config and trims the chart string", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      chart: '\n{ "type": "bar" }\n',
      chartUrl: "https://quickchart.io/chart/render/zf-1",
      chartMakerUrl: "https://quickchart.io/chart-maker/view/zf-1",
      warnings: ["check it"],
    },
  }]);
  const out = await exec(action, { description: "bar of 1,2,3", width: 700 }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/natural/config");
  assertEquals(JSON.parse(calls[0].body!), { description: "bar of 1,2,3", width: 700 });
  assertEquals(out.chart, '{ "type": "bar" }');
  assertEquals(out.chartUrl, "https://quickchart.io/chart/render/zf-1");
  assertEquals(out.warnings, ["check it"]);
});

Deno.test("chart-draft-from-text: missing warnings become an empty list; errors throw", async () => {
  const { ctx } = mockCtx([{ body: { success: true, chart: "{}" } }]);
  assertEquals((await exec(action, { description: "x" }, ctx)).warnings, []);
  const bad = mockCtx([{ status: 400, body: { error: "no description" } }]);
  await assertRejects(() => exec(action, { description: "" }, bad.ctx), Error, "no description");
});
