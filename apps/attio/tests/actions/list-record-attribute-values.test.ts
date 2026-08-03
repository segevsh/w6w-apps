import { assert, assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import listRecordAttributeValues from "../../actions/list-record-attribute-values.ts";

Deno.test("list-record-attribute-values: builds the four-segment path and passes show_historic", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listRecordAttributeValues.execute({
    object: "deals",
    recordId: "r1",
    attribute: "stage",
    showHistoric: true,
    limit: 10,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/objects/deals/records/r1/attributes/stage/values");
  assertEquals(url.searchParams.get("show_historic"), "true");
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("list-record-attribute-values: flattens each value while keeping the history envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: [
        {
          active_from: "2023-01-01T00:00:00Z",
          active_until: "2023-02-01T00:00:00Z",
          attribute_type: "status",
          status: { title: "Lead" },
        },
        {
          active_from: "2023-02-01T00:00:00Z",
          active_until: null,
          attribute_type: "status",
          status: { title: "Won" },
        },
      ],
    },
  }]);
  const out = await run<{
    records: Array<Record<string, unknown>>;
    values_flat: unknown[];
  }>(listRecordAttributeValues, { object: "deals", recordId: "r1", attribute: "stage" }, ctx);

  assertEquals(out.values_flat, ["Lead", "Won"]);
  // The whole point of asking for history is `active_from`; it must survive.
  assertEquals(out.records[0].active_from, "2023-01-01T00:00:00Z");
});

Deno.test("list-record-attribute-values: warns that show_historic 400s on COMINT/enriched attributes", () => {
  assert(/400/.test(param(listRecordAttributeValues, "showHistoric").hint!));
});
