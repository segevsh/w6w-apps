import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { idParam, labelColorOptions, paginationParams, sortParam } from "../../lib/params.ts";

test("paginationParams: declares items and page as number params", () => {
  const keys = paginationParams.map((p) => p.key);
  assertEquals(keys, ["items", "page"]);
  assertEquals(paginationParams.every((p) => p.type === "number"), true);
});

test("sortParam: a string param named sort", () => {
  assertEquals(sortParam.key, "sort");
  assertEquals(sortParam.type, "string");
});

test("idParam: required number param named id", () => {
  const p = idParam("Widget ID", "hint");
  assertEquals(p, { key: "id", label: "Widget ID", type: "number", required: true, hint: "hint" });
});

test("labelColorOptions: nine named colors, matching the vendor's fixed palette", () => {
  assertEquals(labelColorOptions.length, 9);
  const values = labelColorOptions.map((o) => o.value);
  assertEquals(new Set(values).size, 9);
  assertEquals(values.includes("d93651"), true); // red
  assertEquals(values.includes("98aab3"), true); // grey
});
