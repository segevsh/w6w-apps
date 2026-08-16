import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/meeting-import.ts";

const RESPONSE = { success: true, jobId: "job-1", message: "Import started" };

Deno.test("meeting-import: POSTs to /meetings/import with the documented body shape", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute({
    name: "1:1 John x Sarah",
    url: "https://example.com/rec.mp4",
    happenedAt: "2024-01-15T09:00:00.000Z",
    dryRun: true,
    participants: ["john@example.com", "sarah@example.com"],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings/import");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "1:1 John x Sarah",
    url: "https://example.com/rec.mp4",
    happenedAt: "2024-01-15T09:00:00.000Z",
    dryRun: true,
    participants: ["john@example.com", "sarah@example.com"],
  });
  assertEquals(out, RESPONSE);
});

Deno.test("meeting-import: omits happenedAt entirely rather than sending an empty string", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute({ name: "x", url: "https://example.com/rec.mp3" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("happenedAt" in body, false);
  assertEquals("participants" in body, false);
  assertEquals("dryRun" in body, false);
});

Deno.test("meeting-import: is declared not idempotent — every call starts a new job", () => {
  assertEquals(action.idempotent, false);
});
