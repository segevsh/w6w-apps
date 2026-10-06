import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/nl-process-text.ts";
import { mockCtx, run } from "../_helpers.ts";

const NL_DOC = {
  language: "en",
  sentiment: 0.1,
  entities: [{ name: "Diffbot", salience: 0.95 }],
  facts: [{ humanReadable: "Diffbot; based in; Menlo Park" }],
  summary: "A startup.",
};

Deno.test("nl-process-text: POSTs the document in an array to nl.diffbot.com and unwraps the first", async () => {
  const { ctx, calls } = mockCtx([{ body: [NL_DOC] }]);
  const out = await run(action, {
    content: "Diffbot is a startup based in Menlo Park.",
    fields: "entities, sentiment ,facts",
    lang: "en",
    summarySentences: 2,
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://nl.diffbot.com/v1/");
  assertEquals(u.searchParams.get("fields"), "entities,sentiment,facts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [{
    content: "Diffbot is a startup based in Menlo Park.",
    lang: "en",
    customSummary: { maxNumberOfSentences: 2 },
  }]);
  assertEquals(out.language, "en");
  assertEquals(out.sentiment, 0.1);
  assertEquals(out.summary, "A startup.");
  assertEquals((out.entities as unknown[]).length, 1);
});

Deno.test("nl-process-text: accepts a bare-object response; missing sections become empty", async () => {
  const { ctx } = mockCtx([{ body: { language: "fr" } }]);
  const out = await run(action, { content: "Bonjour" }, ctx);
  assertEquals(out.language, "fr");
  assertEquals(out.entities, []);
  assertEquals(out.categories, null);
});

Deno.test("nl-process-text: omits fields when blank; a 400 messages array is surfaced", async () => {
  const bad = mockCtx([{ status: 400, body: { messages: ["content must not be empty"] } }]);
  await assertRejects(
    () => run(action, { content: "", fields: " " }, bad.ctx),
    Error,
    "content must not be empty",
  );
  assertEquals(new URL(bad.calls[0].url).searchParams.has("fields"), false);
});
