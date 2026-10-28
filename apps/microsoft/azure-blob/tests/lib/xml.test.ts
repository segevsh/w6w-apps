import { assertEquals, assertThrows } from "@std/assert";
import { child, children, decodeText, parseXml, text, toRecord } from "../../lib/xml.ts";

/** A real List Containers response, trimmed. */
const LIST_CONTAINERS = `﻿<?xml version="1.0" encoding="utf-8"?>
<EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net/">
  <Containers>
    <Container>
      <Name>uploads</Name>
      <Properties>
        <Last-Modified>Mon, 18 Aug 2026 10:00:00 GMT</Last-Modified>
        <PublicAccess>blob</PublicAccess>
      </Properties>
    </Container>
    <Container>
      <Name>logs</Name>
      <Properties><Last-Modified>Tue, 19 Aug 2026 10:00:00 GMT</Last-Modified></Properties>
    </Container>
  </Containers>
  <NextMarker />
</EnumerationResults>`;

Deno.test("parseXml: reads a real List Containers response", () => {
  const root = parseXml(LIST_CONTAINERS);
  const containers = children(child(child(root, "EnumerationResults"), "Containers"), "Container");
  assertEquals(containers.length, 2);
  assertEquals(text(containers[0], "Name"), "uploads");
  assertEquals(text(containers[1], "Name"), "logs");
});

/** Azure sends a BOM and a declaration; both have to go before parsing. */
Deno.test("parseXml: strips the BOM, the declaration and comments", () => {
  const root = parseXml('﻿<?xml version="1.0"?><!-- note --><A><B>x</B></A>');
  assertEquals(text(root, "A", "B"), "x");
});

/** `<NextMarker />` is how Azure says there are no more pages. */
Deno.test("parseXml: a self-closing element is present and empty", () => {
  const root = parseXml(LIST_CONTAINERS);
  assertEquals(text(root, "EnumerationResults", "NextMarker"), "");
  assertEquals(text(root, "EnumerationResults", "Missing"), undefined);
});

/** Repeated tags collect; a single one is still a list of one. */
Deno.test("children: repeated tags collect, and an absent tag is an empty list", () => {
  const root = parseXml("<R><I>a</I><I>b</I></R>");
  assertEquals(children(child(root, "R"), "I").map((n) => n.text), ["a", "b"]);
  assertEquals(children(child(root, "R"), "Z"), []);
  assertEquals(children(undefined, "I"), []);
});

/** XML has no types; nothing is coerced on the way through. */
Deno.test("toRecord: flattens leaf children to strings, skipping branches", () => {
  const root = parseXml(
    "<Blob><Name>a.txt</Name><Properties><Content-Length>1024</Content-Length></Properties></Blob>",
  );
  const blob = child(root, "Blob");
  assertEquals(toRecord(blob), { Name: "a.txt" });
  assertEquals(toRecord(child(blob, "Properties")), { "Content-Length": "1024" });
  assertEquals(typeof toRecord(child(blob, "Properties"))["Content-Length"], "string");
});

Deno.test("decodeText: resolves the five predefined entities and numeric references", () => {
  assertEquals(decodeText("a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;"), `a & b <c> "d" 'e'`);
  assertEquals(decodeText("&#65;&#x42;"), "AB");
});

/**
 * The class of bug that makes XML parsing dangerous. This reader resolves no
 * entities beyond the predefined five, so a declared one stays literal text
 * rather than being expanded into anything.
 */
Deno.test("decodeText: a custom or external entity is left alone, not resolved", () => {
  assertEquals(decodeText("&xxe;"), "&xxe;");
  assertEquals(decodeText("&custom;"), "&custom;");
  const root = parseXml(
    '<!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r>&xxe;</r>',
  );
  assertEquals(text(root, "r"), "&xxe;");
});

/** A response this cannot read should be heard about, not guessed at. */
Deno.test("parseXml: refuses malformed input rather than guessing", () => {
  assertThrows(() => parseXml("<A><B></A>"), Error, "never closed");
  assertThrows(() => parseXml("</A>"), Error, "unexpected </A>");
});

Deno.test("parseXml: an empty document is an empty tree, not an error", () => {
  const root = parseXml("");
  assertEquals(root.children, {});
  assertEquals(root.text, "");
});

Deno.test("text: walks a path and stops at the first missing element", () => {
  const root = parseXml("<A><B><C>deep</C></B></A>");
  assertEquals(text(root, "A", "B", "C"), "deep");
  assertEquals(text(root, "A", "X", "C"), undefined);
  assertEquals(text(undefined, "A"), undefined);
});
