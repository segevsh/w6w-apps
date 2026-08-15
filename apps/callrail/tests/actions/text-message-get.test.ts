import { assertEquals } from "@std/assert";
import textMessageGet from "../../actions/text-message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-message-get: fetches a single conversation with its full message history", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "KZaGR", messages: [{ id: 1, content: "hi" }] } }]);
  const out = await textMessageGet.execute({ accountId: "ACC1", conversationId: "KZaGR" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/text-messages/KZaGR.json");
  assertEquals(out, { id: "KZaGR", messages: [{ id: 1, content: "hi" }] });
});
