import { assertEquals } from "@std/assert";
import {
  buildReport,
  classify,
  measure,
  renderMarkdown,
} from "./output-coverage.ts";

Deno.test("classify: non-empty array output is declared", () => {
  assertEquals(
    classify({ output: [{ name: "id", type: "string" }] }),
    "declared",
  );
});

Deno.test("classify: output: [] is declared-empty, never neither", () => {
  assertEquals(classify({ output: [] }), "declared-empty");
  assertEquals(classify({ output: [], sample: {} }), "declared-empty");
});

Deno.test("classify: { source } output is dynamic", () => {
  assertEquals(classify({ output: { source: "x" } }), "dynamic");
});

Deno.test("classify: no output key with a sample is sample-only", () => {
  assertEquals(classify({ sample: { a: 1 } }), "sample-only");
});

Deno.test("classify: neither output nor sample is neither", () => {
  assertEquals(classify({ name: "a" }), "neither");
});

Deno.test("measure: actions and triggers counted separately, items counted", () => {
  const row = measure("eventbrite", {
    actions: [{ output: [] }, { name: "b" }],
    triggers: [{
      output: [{ name: "l", type: "array", items: { type: "string" } }],
    }],
  });
  assertEquals(row.cohost, true);
  assertEquals(row.actions["declared-empty"], 1);
  assertEquals(row.actions.neither, 1);
  assertEquals(row.triggers.declared, 1);
  assertEquals(row.itemsFields, 1);
});

Deno.test("report: worst first, errors apart, markdown has totals and cohost", () => {
  const good = measure("good", { actions: [{ output: [{ name: "a" }] }] });
  const bad = measure("slack", { actions: [{}, {}] });
  const err = { ...measure("boom", {}), error: "x" };
  const rep = buildReport([good, bad, err]);
  assertEquals(rep.rows.map((r) => r.path), ["slack", "good"]);
  assertEquals(rep.errors.length, 1);
  assertEquals(rep.cohost.map((r) => r.path), ["slack"]);
  const md = renderMarkdown(rep);
  assertEquals(md.includes("Totals: 3 apps (1 import errors)"), true);
  assertEquals(md.includes("## Cohost apps"), true);
});
