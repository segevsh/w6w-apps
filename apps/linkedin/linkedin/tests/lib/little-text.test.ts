import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { escapeLittleText } from "../../lib/little-text.ts";

test("escapeLittleText: leaves plain text unchanged", () => {
  assertEquals(escapeLittleText("Hello World"), "Hello World");
});

test("escapeLittleText: escapes every reserved character with a backslash", () => {
  assertEquals(escapeLittleText("#tag"), "\\#tag");
  assertEquals(escapeLittleText("@mention"), "\\@mention");
  assertEquals(escapeLittleText("(parens)"), "\\(parens\\)");
  assertEquals(escapeLittleText("[brackets]"), "\\[brackets\\]");
  assertEquals(escapeLittleText("{braces}"), "\\{braces\\}");
  assertEquals(escapeLittleText("<angle>"), "\\<angle\\>");
  assertEquals(escapeLittleText("a|b"), "a\\|b");
  assertEquals(escapeLittleText("a*b_c~d"), "a\\*b\\_c\\~d");
  assertEquals(escapeLittleText("back\\slash"), "back\\\\slash");
});

test("escapeLittleText: mixed text keeps non-reserved characters as-is", () => {
  assertEquals(
    escapeLittleText("Excited to share #news about @[our] launch!"),
    "Excited to share \\#news about \\@\\[our\\] launch!",
  );
});
