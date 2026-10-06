import { assertEquals, assertRejects } from "@std/assert";
import ask from "../../actions/ask.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("ask: GET /v1/ask with the question and filters; a 200 is a completed answer", async () => {
  const sources = [{ id: "n1", title: "T", url: "u", updatedAt: "2026-01-01T00:00:00Z" }];
  const { ctx, calls } = mockCtx([{ body: { answer: "Forty-two", sources } }]);
  const out = await ask.execute(
    { question: " What is it? ", parentNoteId: "p1", assistantId: "a1", wait: true },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/ask");
  assertEquals(queryOf(calls[0].url), {
    question: "What is it?",
    parentNoteId: "p1",
    assistantId: "a1",
    wait: "true",
  });
  assertEquals(out, { status: "completed", answer: "Forty-two", sources });
});

Deno.test("ask: a 202 processing body is returned as a thread to poll, never as an answer", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    headers: { "content-type": "application/json", "retry-after": "5" },
    body: {
      status: "processing",
      threadId: "th1",
      retryAfterSeconds: 7,
      message: "Still working",
      answer: "Your answer is being prepared, poll th1",
      sources: [],
    },
  }]);
  const out = await ask.execute({ question: "q" }, ctx) as Record<string, unknown>;
  assertEquals(out, {
    status: "processing",
    threadId: "th1",
    retryAfterSeconds: 7,
    message: "Still working",
  });
  assertEquals("answer" in out, false);
});

Deno.test("ask: a 202 without retryAfterSeconds falls back to the Retry-After header", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    headers: { "content-type": "application/json", "retry-after": "9" },
    body: { status: "processing", threadId: "th2" },
  }]);
  const out = await ask.execute({ question: "q" }, ctx) as Record<string, unknown>;
  assertEquals(out.retryAfterSeconds, 9);
});

Deno.test("ask: a blank question is refused before any request; 429 surfaces the vendor message", async () => {
  const none = mockCtx([]);
  await assertRejects(
    async () => await ask.execute({ question: "  " }, none.ctx),
    Error,
    "question",
  );
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 429, body: slError("rate-limit", "Ask rate limit") }]);
  await assertRejects(
    async () => await ask.execute({ question: "q" }, ctx),
    Error,
    "Slite 429: Ask rate limit (rate-limit)",
  );
});
