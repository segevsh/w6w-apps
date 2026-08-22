import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, text } from "./_shared.ts";
import action from "../../actions/template-render.ts";

Deno.test("template-render: posts the template and returns the text verbatim", async () => {
  const { ctx, calls } = mockCtx([text("4")], { display });
  const result = await action.execute!({
    template: "{{ states.light | selectattr('state','eq','on') | list | count }}",
  }, ctx) as { result: string; numeric: number };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/template");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).template.includes("selectattr"), true);
  assertEquals(result.result, "4");
  assertEquals(result.numeric, 4);
});

/** The endpoint answers with rendered text, not a JSON document. */
Deno.test("template-render: asks for text rather than JSON", async () => {
  const { ctx, calls } = mockCtx([text("on")], { display });
  const result = await action.execute!({ template: "{{ states('light.kitchen') }}" }, ctx) as {
    result: string;
    numeric?: number;
  };
  assertEquals(calls[0].headers["accept"], "text/plain");
  assertEquals(result.result, "on");
  assertEquals(result.numeric, undefined);
});

/**
 * Home Assistant renders lists as Python repr with single quotes, which is not
 * valid JSON — and the error has to say so rather than "unexpected token".
 */
Deno.test("template-render: a Python-repr list fails parsing with the actual fix", async () => {
  const { ctx } = mockCtx([text("['a', 'b']")], { display });
  const error = await assertRejects(
    async () => await action.execute!({ template: "{{ ['a','b'] }}", parseJson: true }, ctx),
    Error,
  );
  assert(/Python repr with single quotes/.test(error.message), error.message);
  assert(/to_json/.test(error.message), error.message);
});

Deno.test("template-render: a to_json template parses cleanly", async () => {
  const { ctx } = mockCtx([text('["a","b"]')], { display });
  const result = await action.execute!({
    template: "{{ ['a','b'] | to_json }}",
    parseJson: true,
  }, ctx) as { parsed: string[] };
  assertEquals(result.parsed, ["a", "b"]);
});

Deno.test("template-render: parsing is opt-in", async () => {
  const { ctx } = mockCtx([text("['a', 'b']")], { display });
  const result = await action.execute!({ template: "{{ ['a','b'] }}" }, ctx) as {
    result: string;
    parsed?: unknown;
  };
  assertEquals(result.result, "['a', 'b']");
  assertEquals(result.parsed, undefined);
});

Deno.test("template-render: needs a template", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`template` is required");
  assertEquals(calls.length, 0);
});

Deno.test("template-render: says it returns plain text", () => {
  assert(/PLAIN TEXT/.test(action.description!), action.description);
});
