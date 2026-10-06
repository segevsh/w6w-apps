import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import customCostCreate from "../../actions/custom-cost-create.ts";

Deno.test("custom-cost-create: POST /custom-costs with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await customCostCreate.execute({
    startDate: "2026-01-01",
    frequency: "ONE_TIME",
    cost: 10,
    tags: "@fb, @ig",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/custom-costs");
  assertEquals(JSON.parse(calls[0].body!), {
    startDate: "2026-01-01",
    frequency: "ONE_TIME",
    cost: 10,
    tags: ["@fb", "@ig"],
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("custom-cost-create: tag count is bounded 1..10", async () => {
  const { ctx } = mockCtx([]);
  const base = { startDate: "2026-01-01", frequency: "DAILY", cost: 1 };
  await assertRejects(
    async () => await customCostCreate.execute({ ...base, tags: "" }, ctx),
    Error,
    "between 1 and 10",
  );
  await assertRejects(
    async () =>
      await customCostCreate.execute({
        ...base,
        tags: Array.from({ length: 11 }, (_, i) => `@t${i}`).join(","),
      }, ctx),
    Error,
    "between 1 and 10",
  );
});
