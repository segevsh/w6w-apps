import { assertEquals } from "@std/assert";
import quoteTrackedLineItemsList from "../../actions/quote-tracked-line-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quote-tracked-line-items-list: returns the body under a name, unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { JobItem: [{ id: 88 }] } }]);
  const result = await quoteTrackedLineItemsList.execute({ quoteId: 201 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/quotes/201/tracked_line_items");
  assertEquals(result.trackedLineItems, { JobItem: [{ id: 88 }] });
});

/** The document types the 200 as a bare object, so no field names are claimed. */
Deno.test("quote-tracked-line-items-list: the output claims no fields", () => {
  assertEquals(quoteTrackedLineItemsList.output, [
    {
      key: "trackedLineItems",
      type: "object",
      label: "The response body, grouped by type — the spec names no fields",
    },
  ]);
});
