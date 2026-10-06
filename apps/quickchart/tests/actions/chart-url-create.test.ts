import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/chart-url-create.ts";
import { exec, mockCtx } from "../_helpers.ts";

const CHART = { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } };

Deno.test("chart-url-create: POSTs /chart/create and returns the short URL and viewer URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, url: "https://quickchart.io/chart/render/zf-abc-123" },
  }]);
  const out = await exec(action, { chart: CHART, backgroundColor: "white" }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/chart/create");
  assertEquals(JSON.parse(calls[0].body!), { chart: CHART, backgroundColor: "white" });
  assertEquals(out, {
    url: "https://quickchart.io/chart/render/zf-abc-123",
    viewUrl: "https://quickchart.io/chart-maker/view/zf-abc-123",
  });
});

Deno.test("chart-url-create: a response without a url is an error", async () => {
  const { ctx } = mockCtx([{ body: { success: true } }]);
  await assertRejects(() => exec(action, { chart: CHART }, ctx), Error, "without a url");
});

Deno.test("chart-url-create: a 500 surfaces the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  await assertRejects(() => exec(action, { chart: CHART }, ctx), Error, "500");
});
