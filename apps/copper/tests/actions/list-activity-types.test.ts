import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";
import action from "../../actions/list-activity-types.ts";

Deno.test("list-activity-types: GETs /activity_types and keeps Copper's category keying", async () => {
  // The response is `{user: [...], system: [...]}`, not a flat array — and that
  // is the point, since an id is only meaningful paired with its category.
  const body = {
    user: [{ id: 0, category: "user", name: "Note" }],
    system: [{ id: 1, category: "system", name: "Property Changed" }],
  };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/activity_types");
  assertEquals(out, body);
});

Deno.test("list-activity-types: declares both category buckets as output", () => {
  assertEquals(outputKeys(action), ["user", "system"]);
});
