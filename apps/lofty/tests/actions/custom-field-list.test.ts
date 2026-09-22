import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/custom-field-list.ts";

Deno.test("custom-field-list: reads the team's field definitions", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{
      attributeName: "Budget",
      attributeType: "currency",
      value: "500000",
      params: '{"option":["a","b"]}',
    }],
  }]);
  const result = await action.execute!({}, ctx) as Array<{ attributeName: string }>;

  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/teamFeatures/listCustomField");
  assertEquals(result[0].attributeName, "Budget");
});

Deno.test("custom-field-list: declares no params", () => {
  assertEquals(action.params, []);
});
