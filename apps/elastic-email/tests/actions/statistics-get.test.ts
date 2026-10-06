import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/statistics-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("statistics-get: GET /statistics with from/to", async () => {
  const { ctx, calls } = mockCtx([{ body: { Recipients: 3, Delivered: 2 } }]);
  const out = await action.execute(
    { from: "2026-10-01T00:00:00", to: "2026-10-06T00:00:00" },
    ctx,
  ) as {
    Delivered: number;
  };
  assertEquals(out.Delivered, 2);
  assertEquals(pathOf(calls[0].url), "/v4/statistics");
  assertEquals(queryOf(calls[0].url), { from: "2026-10-01T00:00:00", to: "2026-10-06T00:00:00" });
});

Deno.test("statistics-get: from is required; `to` is optional", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ from: "2026-10-01T00:00:00" }, ctx);
  assertEquals(queryOf(calls[0].url), { from: "2026-10-01T00:00:00" });
});
