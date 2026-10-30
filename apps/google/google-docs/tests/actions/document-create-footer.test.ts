import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create-footer.ts";

test("document-create-footer: emits DEFAULT createFooter with sectionBreakLocation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", index: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      createFooter: {
        type: "DEFAULT",
        sectionBreakLocation: { segmentId: "", index: 0 },
      },
    }],
  });
});
