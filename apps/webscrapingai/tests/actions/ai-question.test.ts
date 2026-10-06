import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/ai-question.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("ai-question: GETs /ai/question with url and question, returns the plain-text answer", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "text/plain", "wsai-request-id": "r1" },
    body: "It is a demo.",
  }]);
  const out = await action.execute({ url: "https://e.test", question: "Summary?" }, ctx);
  assertEquals(out, { answer: "It is a demo.", requestId: "r1" });
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.webscraping.ai/ai/question");
  assertEquals(u.searchParams.get("question"), "Summary?");
  assertEquals(u.searchParams.get("url"), "https://e.test");
  assertEquals(u.searchParams.has("api_key"), false);
});

Deno.test("ai-question: forwards fetch options; a blank question or url makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await action.execute({
    url: "https://e.test",
    question: "q",
    js: false,
    proxy: "residential",
    country: "DE",
    headers: { Cookie: "a=b" },
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("js"), "false");
  assertEquals(q.get("proxy"), "residential");
  assertEquals(q.get("country"), "de");
  assertEquals(q.get("headers[Cookie]"), "a=b");
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", question: " " }, none.ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () => await action.execute({ url: "", question: "q" }, none.ctx),
    Error,
    "required",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("ai-question: a target-blocked 500 surfaces error_code, message and target status", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { message: "blocked", error_code: "target_blocked", status_code: 403 },
  }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", question: "q" }, ctx),
    Error,
    "target_blocked: blocked (target HTTP 403)",
  );
});
