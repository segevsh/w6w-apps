import { assert, assertEquals } from "@std/assert";
import { buildMultipart } from "../../lib/multipart.ts";

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

Deno.test("buildMultipart: encodes text fields with the shared boundary", () => {
  const { body, contentType } = buildMultipart({ data: '{"a":1}' });
  const text = decode(body);
  const boundary = contentType.split("boundary=")[1];
  assert(text.includes(`--${boundary}`));
  assert(text.includes('Content-Disposition: form-data; name="data"'));
  assert(text.includes('{"a":1}'));
  assert(text.trimEnd().endsWith(`--${boundary}--`));
});

Deno.test("buildMultipart: splices a binary file part between text fields intact", () => {
  const fileBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x01]); // "%PDF" + non-UTF8 bytes
  const { body } = buildMultipart({ data: "{}" }, {
    filename: "doc.pdf",
    contentType: "application/pdf",
    bytes: fileBytes,
  });

  // Find the byte offset right after the file part's header (its own \r\n\r\n) and confirm
  // the exact file bytes appear there, untouched by any text encoding round-trip.
  const headerText = "Content-Type: application/pdf\r\n\r\n";
  const headerBytes = new TextEncoder().encode(headerText);
  let idx = -1;
  outer: for (let i = 0; i <= body.length - headerBytes.length; i++) {
    for (let j = 0; j < headerBytes.length; j++) {
      if (body[i + j] !== headerBytes[j]) continue outer;
    }
    idx = i + headerBytes.length;
    break;
  }
  assert(idx >= 0, "file part header not found");
  const slice = body.slice(idx, idx + fileBytes.length);
  assertEquals(slice, fileBytes);
});

Deno.test("buildMultipart: escapes quotes/backslashes/newlines out of header values", () => {
  const { body } = buildMultipart({ 'weird"name': "value\r\nwith\\stuff" });
  const text = decode(body);
  assert(!text.includes('name="weird"name"'));
});
