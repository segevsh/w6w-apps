import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/slide-move.ts";

Deno.test("slide-move: builds updateSlidesPosition with the IDs and index", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute(
    { presentationId: "p1", slideObjectIds: ["a", "b"], insertionIndex: 0 },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ updateSlidesPosition: { slideObjectIds: ["a", "b"], insertionIndex: 0 } }],
  });
});

Deno.test("slide-move: rejects an empty ID list without calling the API", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", slideObjectIds: [], insertionIndex: 0 }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("slide-move: rejects duplicate IDs, which the API forbids", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () =>
      action.execute({ presentationId: "p1", slideObjectIds: ["a", "a"], insertionIndex: 1 }, ctx),
    Error,
    "duplicates",
  );
  assertEquals(calls.length, 0);
});

Deno.test("slide-move: is non-idempotent — the index is pre-move relative", () => {
  assertEquals(action.idempotent, false);
});
