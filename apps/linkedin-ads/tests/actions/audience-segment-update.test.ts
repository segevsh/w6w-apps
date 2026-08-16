import { assertEquals, assertRejects } from "@std/assert";
import audienceSegmentUpdate from "../../actions/audience-segment-update.ts";
import { mockCtx, noContentResponse, pathOf } from "../_helpers.ts";

Deno.test("audience-segment-update: a plain single PARTIAL_UPDATE by numeric id", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await audienceSegmentUpdate.execute({ segmentId: "10804", name: "New Name" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments/10804");
  assertEquals(calls[0].headers["x-restli-method"], "PARTIAL_UPDATE");
  assertEquals(JSON.parse(calls[0].body!), { patch: { $set: { name: "New Name" } } });
  assertEquals(result, { ok: true });
});

Deno.test("audience-segment-update: combines multiple fields in one $set", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await audienceSegmentUpdate.execute(
    { segmentId: "1", description: "d", sourceSegmentId: "s", accessPolicy: "PRIVATE" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).patch.$set, {
    description: "d",
    sourceSegmentId: "s",
    accessPolicy: "PRIVATE",
  });
});

Deno.test("audience-segment-update: rejects when nothing is set to change, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await audienceSegmentUpdate.execute({ segmentId: "1" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
