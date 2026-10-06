import { assertEquals, assertRejects } from "@std/assert";
import chartGet from "../../actions/chart-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const base = {
  funnelId: "f1",
  subtype: "chart_visitor_devices",
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-31T00:00:00.000Z",
};

Deno.test("chart-get: GET /metrics/charts/{subtype}", async () => {
  const pts = [{ key: "mobile", value: 10 }];
  const { ctx, calls } = mockCtx([{ body: envelope(pts) }]);
  const out = await chartGet.execute(base, ctx) as { data: unknown };
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/metrics/charts/chart_visitor_devices");
  assertEquals(queryOf(calls[0].url), { from: base.from, to: base.to });
  assertEquals(out.data, pts);
});

Deno.test("chart-get: abTest is forwarded for page-to-page conversion", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await chartGet.execute({
    ...base,
    subtype: "chart_page_to_page_conversion_rate",
    abTest: "variant",
  }, ctx);
  assertEquals(queryOf(calls[0].url).abTest, "variant");
});

Deno.test("chart-get: abTest on any other subtype is refused offline", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(chartGet.execute({ ...base, abTest: "all" }, ctx)),
    Error,
    "abTest is only valid",
  );
  assertEquals(calls.length, 0);
});

Deno.test("chart-get: an invalid abTest value is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        chartGet.execute(
          { ...base, subtype: "chart_page_to_page_conversion_rate", abTest: "both" },
          ctx,
        ),
      ),
    Error,
    "abTest must be",
  );
});

Deno.test("chart-get: from must be before to", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(chartGet.execute({ ...base, to: base.from }, ctx)),
    Error,
    "from must be before to",
  );
});

Deno.test("chart-get: offers the seven documented charts", () => {
  assertEquals((chartGet.params!.find((p) => p.key === "subtype")!.options as unknown[]).length, 7);
});
