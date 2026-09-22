import { assertEquals } from "@std/assert";
import rateCardsList from "../../actions/rate-cards-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rate-cards-list: reads GET /v2/rate_cards", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Standard" }] }]);
  const result = await rateCardsList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/rate_cards");
  assertEquals(result, { rateCards: [{ id: 1, name: "Standard" }] });
});

/** A rate card is `{ id, name, currency }` — the rates are not on it. */
Deno.test("rate-cards-list: the output says what a rate card actually carries", () => {
  assertEquals(rateCardsList.output, [
    { key: "rateCards", type: "array", label: "Rate cards — `{ id, name, currency }`" },
  ]);
});
