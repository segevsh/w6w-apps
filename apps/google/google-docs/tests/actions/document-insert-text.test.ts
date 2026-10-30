import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-insert-text.ts";

test("document-insert-text: emits insertText with endOfSegmentLocation default", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute!({ documentURL: "d-1", text: "hello" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/documents/d-1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      insertText: {
        text: "hello",
        endOfSegmentLocation: { segmentId: "" },
      },
    }],
  });
});

test("document-insert-text: locationChoice=location sets index", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", text: "x", locationChoice: "location", index: 7 },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.requests[0].insertText.location, { segmentId: "", index: 7 });
});
