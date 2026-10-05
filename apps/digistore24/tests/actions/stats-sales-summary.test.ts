import { assertEquals, assertRejects } from "@std/assert";
import statsSalesSummary from "../../actions/stats-sales-summary.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "statsSalesSummary";
const DATA = { "ok": "Y" };

Deno.test("stats-sales-summary: calls statsSalesSummary with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await statsSalesSummary.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("stats-sales-summary: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await statsSalesSummary.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});
