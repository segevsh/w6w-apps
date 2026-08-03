import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import listCustomFields from "../../actions/list-custom-fields.ts";

/**
 * The lower-cased collection key is the trap this endpoint is most likely to
 * spring, so it is exercised end to end rather than only in the lib test.
 */
Deno.test("list-custom-fields: unwraps the lower-cased `customfields` key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      _metadata: { collection: "customfields", total: 2 },
      customfields: [
        { id: 2, label: "Birthday", name: "customBirthday", type: "date", isRecurring: true },
        { id: 7, label: "Close price", name: "customClosePrice", type: "number" },
      ],
    },
  }]);
  const result = await run<{ records: Array<{ name: string }> }>(listCustomFields, {}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/customFields");
  assertEquals(result.records.length, 2);
  assertEquals(result.records[1].name, "customClosePrice");
});

Deno.test("list-custom-fields: tells you to send `name`, not `label`", () => {
  const d = listCustomFields.description!;
  assert(d.includes("customClosePrice"), d);
  assert(/label/i.test(d), d);
});
