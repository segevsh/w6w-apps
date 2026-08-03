import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-get.ts";

Deno.test("quote-get: fetches by id with a bounded line-item page", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { quote: { id: "q1" } } } }]);
  await action.execute({ quoteId: "q1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.variables, { id: "q1" });
  assert(sent.query.includes("lineItems(first: 50)"));
});
