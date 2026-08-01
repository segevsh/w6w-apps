import { assertEquals } from "@std/assert";
import { base64ToBinaryString, bytesToBase64 } from "../../lib/base64.ts";

Deno.test("base64: bytesToBase64 round-trips arbitrary bytes exactly", () => {
  const bytes = new Uint8Array([0, 1, 2, 0x7f, 0x80, 0xff, 0x89, 0x50, 0x4e, 0x47]);
  const b64 = bytesToBase64(bytes);
  const roundTripped = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  assertEquals(roundTripped, bytes);
});

Deno.test("base64: base64ToBinaryString decodes to a Latin-1 binary string", () => {
  assertEquals(base64ToBinaryString(btoa("hello")), "hello");
});
