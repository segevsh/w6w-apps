import { assertEquals } from "@std/assert";
import { decodeXmlEntities, xmlBlocks, xmlError, xmlText } from "../../lib/xml.ts";

Deno.test("xml: xmlText extracts and decodes the first matching tag", () => {
  assertEquals(xmlText("<Name>bucket &amp; co</Name>", "Name"), "bucket & co");
  assertEquals(xmlText("<Foo/>", "Foo"), "");
  assertEquals(xmlText("<Bar>x</Bar>", "Missing"), undefined);
});

Deno.test("xml: xmlBlocks returns every sibling occurrence's inner content", () => {
  const xml = "<Contents><Key>a</Key></Contents><Contents><Key>b</Key></Contents>";
  const blocks = xmlBlocks(xml, "Contents");
  assertEquals(blocks.length, 2);
  assertEquals(xmlText(blocks[0], "Key"), "a");
  assertEquals(xmlText(blocks[1], "Key"), "b");
});

Deno.test("xml: xmlError parses S3's uniform error body", () => {
  const xml =
    "<Error><Code>NoSuchBucket</Code><Message>The bucket does not exist</Message></Error>";
  assertEquals(xmlError(xml), { code: "NoSuchBucket", message: "The bucket does not exist" });
});

Deno.test("xml: xmlError returns undefined when there is no <Error>", () => {
  assertEquals(xmlError("<ListAllMyBucketsResult></ListAllMyBucketsResult>"), undefined);
});

Deno.test("xml: decodeXmlEntities handles named and numeric entities", () => {
  assertEquals(
    decodeXmlEntities("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;"),
    "a & b <c> \"d\" 'e'",
  );
});
