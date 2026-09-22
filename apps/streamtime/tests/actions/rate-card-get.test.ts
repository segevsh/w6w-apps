import { assertEquals } from "@std/assert";
import rateCardGet from "../../actions/rate-card-get.ts";
import { assertRejects } from "@std/assert";
import { mockCtx, pathOf, unauthorisedResponse } from "../_helpers.ts";

Deno.test("rate-card-get: reads GET /v2/rate_cards/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 3, name: "Standard", currency: { id: "GBP", name: "Pound", symbol: "£" } } },
  ]);
  const result = await rateCardGet.execute({ rateCardId: 3 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/rate_cards/3");
  assertEquals(result.id, 3);
});

Deno.test("rate-card-get: a rejection surfaces the vendor's own sentence", async () => {
  const { ctx } = mockCtx([unauthorisedResponse()]);
  const error = await assertRejects(
    async () => {
      await rateCardGet.execute({ rateCardId: 3 }, ctx);
    },
    Error,
  ) as Error;
  assertEquals(error.message.includes("You are not authorised to make this request"), true);
});
