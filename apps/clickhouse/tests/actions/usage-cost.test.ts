import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-cost.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const D = { display: { organizationId: ORG, plane: "control" } };

const costs = {
  status: 200,
  body: {
    result: {
      grandTotalCHC: 150,
      costs: [
        { entityId: "svc-1", computeCHC: 80, storageCHC: 10, dataTransferCHC: 5, totalCHC: 95 },
        { entityId: "svc-2", computeCHC: 40, storageCHC: 15, totalCHC: 55 },
      ],
    },
  },
};

Deno.test("usage-cost: reads the usage endpoint with the window", async () => {
  const { ctx, calls } = mockCtx([costs], D);
  const result = await action.execute(
    { fromDate: "2026-08-01", toDate: "2026-08-19" },
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assert(url.pathname.endsWith("/usageCost"), url.pathname);
  assertEquals(url.searchParams.get("from_date"), "2026-08-01");
  assertEquals(url.searchParams.get("to_date"), "2026-08-19");
  assertEquals(result.totalCost, 150);
});

/** Compute is where a service with idle scaling off shows up. */
Deno.test("usage-cost: splits compute, storage and transfer", async () => {
  const { ctx } = mockCtx([costs], D);
  const result = await action.execute(
    { fromDate: "2026-08-01", toDate: "2026-08-19" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.computeCost, 120);
  assertEquals(result.storageCost, 25);
  assertEquals(result.dataTransferCost, 5);
  assert(
    /compute is where a service with idle scaling off shows up/i.test(action.description!),
    action.description,
  );
});

Deno.test("usage-cost: totals per service", async () => {
  const { ctx } = mockCtx([costs], D);
  const result = await action.execute(
    { fromDate: "2026-08-01", toDate: "2026-08-19" },
    ctx,
  ) as Record<string, unknown>;
  const byService = result.byService as Record<string, number>;
  assertEquals(Object.keys(byService).sort(), ["svc-1", "svc-2"]);
});

/** ClickHouse Cloud caps how wide a usage query may be. */
Deno.test("usage-cost: both dates are required, and it says why", async () => {
  for (const input of [{ fromDate: "2026-08-01" }, { toDate: "2026-08-19" }, {}]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute(input, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/caps how wide a usage query may be/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("usage-cost: no records is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: { costs: [] } } }], D);
  const result = await action.execute(
    { fromDate: "2026-08-01", toDate: "2026-08-19" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.totalCost, 0);
});
