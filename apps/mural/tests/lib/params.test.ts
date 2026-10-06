import { assertEquals } from "@std/assert";
import { int, json, multi, select, str } from "../../lib/params.ts";

Deno.test("params: builders set type, options and integer validation", () => {
  assertEquals(str("a", "A", { required: true }).type, "string");
  assertEquals(int("n", "N").validation, { integer: true });
  assertEquals(json("j", "J").type, "json");
  assertEquals(select("s", "S", ["x"]).options, [{ value: "x", label: "x" }]);
  assertEquals(multi("m", "M", ["y"]).type, "multiselect");
});
