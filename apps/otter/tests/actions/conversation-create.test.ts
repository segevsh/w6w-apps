import { assertEquals } from "@std/assert";
import conversationCreate from "../../actions/conversation-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-create: POSTs the file URL and optional name", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", completed_at: "2025-12-01 01:00:00Z", file: "audio.mp3" },
  }]);

  const out = await conversationCreate.execute(
    { file: "https://example.com/file.mp4", name: "Product Launch Meeting" },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.otter.ai/v1/conversations");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    file: "https://example.com/file.mp4",
    name: "Product Launch Meeting",
  });
  assertEquals(out.status, "success");
});

Deno.test("conversation-create: omits name when not given, rather than sending an empty string", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await conversationCreate.execute({ file: "https://example.com/a.mp3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { file: "https://example.com/a.mp3" });
});

Deno.test("conversation-create: is a non-idempotent perform action", () => {
  assertEquals(conversationCreate.type, "perform");
  assertEquals(conversationCreate.idempotent, false);
});
