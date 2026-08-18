import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/text-analyze.ts";

const display = { projectId: "proj_1" };
const ok = { status: 200, body: { metadata: { request_id: "req_1" }, results: { topics: {} } } };

Deno.test("text-analyze: posts text and asks for the requested analyses", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ text: "The invoice is wrong.", sentiment: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.deepgram.com/v1/read");
  assertEquals(JSON.parse(calls[0].body!), { text: "The invoice is wrong." });
  assertEquals(url.searchParams.get("sentiment"), "true");
});

Deno.test("text-analyze: a URL is sent instead of text", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ url: "https://x/doc.txt", topics: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://x/doc.txt" });
});

/**
 * Strict keeps the set of possible outcomes equal to the set given, which is
 * what a routing rule needs.
 */
Deno.test("text-analyze: custom topics default to strict matching", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ text: "x", customTopic: "billing dispute, churn risk" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("custom_topic"), ["billing dispute", "churn risk"]);
  assertEquals(q.get("custom_topic_mode"), "strict");
  assertEquals(q.get("topics"), "true");
});

Deno.test("text-analyze: extended matching is available when asked for", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ text: "x", customIntent: "wants a demo", mode: "extended" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("custom_intent_mode"), "extended");
  assertEquals(q.get("intents"), "true");
});

/** Asking for no analysis returns nothing and still costs a request. */
Deno.test("text-analyze: refuses when no analysis was requested", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ text: "x" }, ctx),
    Error,
    "at least one analysis",
  );
  assertEquals(calls.length, 0);
});

Deno.test("text-analyze: needs text or a URL, and refuses both", async () => {
  const none = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, none.ctx), Error, "text");
  const both = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ text: "x", url: "https://y" }, both.ctx),
    Error,
    "not both",
  );
});

/** The text is the caller's content. */
Deno.test("text-analyze: logs the request id and nothing analysed", async () => {
  const { ctx, logs } = mockCtx([ok], { display });
  await action.execute!({ text: "confidential complaint", sentiment: true }, ctx);
  assert(!JSON.stringify(logs).includes("confidential"), JSON.stringify(logs));
  assertEquals(logs[0].data, { requestId: "req_1" });
});
