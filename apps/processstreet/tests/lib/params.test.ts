import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { cursorParams } from "../../lib/params.ts";

test("cursorParams: declares a single, advanced, optional `cursor` field", () => {
  assertEquals(cursorParams.length, 1);
  assertEquals(cursorParams[0].key, "cursor");
  assertEquals(cursorParams[0].required, undefined);
});
