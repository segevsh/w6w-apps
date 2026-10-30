import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createThread from "../../actions/create-thread.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("create-thread: PUT /threads with required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await createThread.execute({ channelID: "ch1", text: "<p>Hi</p>" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/threads");
  assertEquals(JSON.parse(calls[0].body!), { text: "<p>Hi</p>", channelID: "ch1" });
});

test("create-thread: mentions the restricted HTML subset in its param hint", () => {
  const text = createThread.params?.find((p) => p.key === "text");
  if (!text?.hint?.includes("<p>")) throw new Error("rich-text hint missing");
});

test("create-thread: is not idempotent", () => {
  assertEquals(createThread.idempotent, false);
});
