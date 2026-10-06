import { assertEquals } from "@std/assert";
import usageGet from "../../actions/usage-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const usage = {
  data: { hour: { "2026-10-05T10:00:00Z": 3 }, day: {}, month: {} },
  per_billing_period: [{ total_images: 12, start: "2026-10-01T00:00:00Z", end: null }],
};

Deno.test("usage-get: GETs /usage and returns the counts", async () => {
  const { ctx, calls } = mockCtx([{ body: usage }]);
  const out = await usageGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/usage");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, usage);
});

Deno.test("usage-get: skipCache is sent only when true", async () => {
  const on = mockCtx([{ body: usage }]);
  await usageGet.execute({ skipCache: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), { skipCache: "true" });
  const off = mockCtx([{ body: usage }]);
  await usageGet.execute({ skipCache: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), {});
});
