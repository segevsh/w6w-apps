import { assertEquals, assertRejects } from "@std/assert";
import kpiGet from "../../actions/kpi-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const base = {
  funnelId: "f1",
  subtype: "kpi_conversion_rate",
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-31T00:00:00.000Z",
};

Deno.test("kpi-get: GET /metrics/kpis/{subtype} with from/to", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ type: "kpiConversionRate", value: 12.5, count: 150 }),
  }]);
  const out = await kpiGet.execute(base, ctx) as { data: { value: number } };
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/metrics/kpis/kpi_conversion_rate");
  assertEquals(queryOf(calls[0].url), { from: base.from, to: base.to });
  assertEquals(out.data.value, 12.5);
});

Deno.test("kpi-get: forwards the timezone offset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await kpiGet.execute({ ...base, offset: "-120" }, ctx);
  assertEquals(queryOf(calls[0].url).offset, "-120");
});

Deno.test("kpi-get: from must be before to, and dates must parse, with no request made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(kpiGet.execute({ ...base, from: base.to, to: base.from }, ctx)),
    Error,
    "from must be before to",
  );
  await assertRejects(
    () => Promise.resolve(kpiGet.execute({ ...base, from: "junk" }, ctx)),
    Error,
    "from is not a valid",
  );
  assertEquals(calls.length, 0);
});

Deno.test("kpi-get: every documented subtype is offered", () => {
  const opts = (kpiGet.params!.find((p) => p.key === "subtype")!.options as { value: string }[])
    .map(
      (o) => o.value,
    );
  assertEquals(opts.length, 9);
});

Deno.test("kpi-get: an unknown-KPI 400 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "KPI not found", status: 400 } }]);
  await assertRejects(
    () => Promise.resolve(kpiGet.execute(base, ctx)),
    Error,
    "Perspective 400: KPI not found",
  );
});
