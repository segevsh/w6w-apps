import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import requestInfo from "../../actions/request-info.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("request-info: POST /zapier/requestInfo sends listing + contact fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await requestInfo.execute({
    mlsNumber: "9",
    mlsRegion: "R",
    email: "a@b.com",
    comments: "Is it still available?",
    sendAutoResponder: false,
    assignTo: { agentUserId: 4 },
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/zapier/requestInfo");
  assertEquals(bodyOf(calls[0]), {
    mlsNumber: "9",
    mlsRegion: "R",
    email: "a@b.com",
    comments: "Is it still available?",
    sendAutoResponder: false,
    assignTo: { agentUserId: 4 },
  });
});
