import { assertEquals } from "@std/assert";
import conversationGet from "../../actions/conversation-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-get: fetches GET /conversations/{id} with a comma-joined include", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z" },
      data: {
        id: "conv1",
        title: "product launch meeting",
        relationships: { insights: [{ topic: "Decisions", text: ["Launch next week"] }] },
      },
    },
  }]);

  const out = await conversationGet.execute(
    { id: "conv1", include: ["insights", "transcript"] },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/conversations/conv1");
  assertEquals(url.searchParams.get("include"), "insights,transcript");
  assertEquals(out.data.title, "product launch meeting");
  assertEquals(out.data.relationships?.insights?.[0].topic, "Decisions");
});

Deno.test("conversation-get: URL-encodes the conversation id", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: {}, data: {} } }]);
  await conversationGet.execute({ id: "conv/1", include: ["all"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/conversations/conv%2F1");
});

Deno.test("conversation-get: include is required, per the docs' own parameter table", () => {
  const param = conversationGet.params!.find((p) => p.key === "include")!;
  assertEquals(param.required, true);
  assertEquals(param.type, "multiselect");
});
