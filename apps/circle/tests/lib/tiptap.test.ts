import { assertEquals, assertThrows } from "@std/assert";
import { resolveBody, textToTipTap } from "../../lib/tiptap.ts";

Deno.test("textToTipTap: one line becomes one paragraph with one text node", () => {
  assertEquals(textToTipTap("Hello"), {
    body: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    },
  });
});

Deno.test("textToTipTap: a blank line separates paragraphs", () => {
  const doc = textToTipTap("One\n\nTwo");
  assertEquals(doc.body.content.length, 2);
  assertEquals(doc.body.content[0].content?.[0].text, "One");
  assertEquals(doc.body.content[1].content?.[0].text, "Two");
});

Deno.test("textToTipTap: a single newline becomes a hardBreak inside one paragraph", () => {
  const doc = textToTipTap("One\nTwo");
  assertEquals(doc.body.content.length, 1);
  assertEquals(doc.body.content[0].content, [
    { type: "text", text: "One" },
    { type: "hardBreak" },
    { type: "text", text: "Two" },
  ]);
});

Deno.test("textToTipTap: empty text still yields a paragraph — `doc` requires content", () => {
  assertEquals(textToTipTap(""), { body: { type: "doc", content: [{ type: "paragraph" }] } });
});

Deno.test("resolveBody: plain text is wrapped", () => {
  assertEquals(resolveBody("Hi", undefined).body.content[0].content?.[0].text, "Hi");
});

Deno.test("resolveBody: a bare `doc` node is wrapped in a body envelope", () => {
  const doc = { type: "doc", content: [{ type: "paragraph" }] };
  assertEquals(resolveBody(undefined, doc), { body: doc });
});

Deno.test("resolveBody: an already-wrapped document passes through with its sidecars", () => {
  // `attachments` must survive — it is the only way to send a signed upload id.
  const wrapped = {
    body: { type: "doc", content: [] },
    attachments: ["eyJfcmFpbHMi"],
  };
  assertEquals(resolveBody(undefined, wrapped), wrapped as never);
});

Deno.test("resolveBody: a JSON string is parsed", () => {
  assertEquals(
    resolveBody(undefined, '{"type":"doc","content":[]}'),
    { body: { type: "doc", content: [] } },
  );
});

Deno.test("resolveBody: supplying both forms is rejected, not silently resolved", () => {
  assertThrows(
    () => resolveBody("hi", { type: "doc", content: [] }, "Post body"),
    Error,
    "not both",
  );
});

Deno.test("resolveBody: supplying neither is rejected", () => {
  assertThrows(() => resolveBody(undefined, undefined, "Post body"), Error, "body is required");
  assertThrows(() => resolveBody("", "", "Post body"), Error, "body is required");
});

Deno.test("resolveBody: invalid JSON and non-documents are rejected by name", () => {
  assertThrows(() => resolveBody(undefined, "{oops", "Post body"), Error, "not valid JSON");
  assertThrows(() => resolveBody(undefined, "[1]", "Post body"), Error, "must be an object");
  assertThrows(() => resolveBody(undefined, { type: "paragraph" }, "Post body"), Error, "TipTap");
});
