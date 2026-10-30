import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create-named-range.ts";

test("document-create-named-range: emits createNamedRange with range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", name: "section-a", startIndex: 10, endIndex: 20 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      createNamedRange: {
        name: "section-a",
        range: { segmentId: "", startIndex: 10, endIndex: 20 },
      },
    }],
  });
});
