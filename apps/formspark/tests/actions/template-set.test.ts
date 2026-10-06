import { assertEquals } from "@std/assert";
import templateSet from "../../actions/template-set.ts";
import { mockCtx, pathOf, problem } from "../_helpers.ts";

Deno.test("template-set: PUT with {code} only", async () => {
  const { ctx, calls } = mockCtx([{ body: { kind: "notification", mode: "code", paused: true } }]);
  const out = await templateSet.execute(
    { formId: "f1", kind: "notification", code: "<b>{{data.email}}</b>" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1/templates/notification");
  assertEquals(JSON.parse(calls[0].body!), { code: "<b>{{data.email}}</b>" });
  assertEquals((out as { paused: boolean }).paused, true);
});

Deno.test("template-set: template_invalid errors[] reach the message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: problem(400, "template_invalid", "The template could not be compiled.", {
      errors: ["syntax-error: {{#if}} was never closed"],
    }),
  }]);
  let msg = "";
  try {
    await templateSet.execute({ formId: "f", kind: "notification", code: "{{#if}}" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(
    msg,
    "Formspark 400 template_invalid: The template could not be compiled. — " +
      "syntax-error: {{#if}} was never closed",
  );
});
