import { assertEquals } from "@std/assert";
import { encodeS3Key } from "../../lib/s3-path.ts";

Deno.test("s3-path: encodes each segment, keeping '/' as a literal separator", () => {
  assertEquals(encodeS3Key("docs/my file.txt"), "docs/my%20file.txt");
  assertEquals(encodeS3Key("a/b/c"), "a/b/c");
  assertEquals(encodeS3Key("no-slash.txt"), "no-slash.txt");
});

Deno.test("s3-path: preserves an empty segment (a literal '//' in the key)", () => {
  assertEquals(encodeS3Key("a//b"), "a//b");
});
