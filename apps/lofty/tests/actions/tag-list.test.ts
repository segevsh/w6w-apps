import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

test("tag-list: reads the team's tags as a bare array", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ tagId: 1, tagName: "Hot Lead", visibleType: 1 }],
  }]);
  const result = await action.execute!({}, ctx) as Array<{ tagName: string }>;

  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/teamFeatures/listTag");
  assertEquals(result[0].tagName, "Hot Lead");
});

test("tag-list: declares no params", () => {
  assertEquals(action.params, []);
});
