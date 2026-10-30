import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/render-template.ts";

test("render-template: POSTs /template-render/ with id + context", async () => {
  const body = { data: { type: "template", id: "t-1", attributes: { html: "<p>hi Alice</p>" } } };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  await action.execute!({ templateId: "t-1", context: { first_name: "Alice" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/template-render/");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "template");
  assertEquals(sent.data.id, "t-1");
  assertEquals(sent.data.attributes.context.first_name, "Alice");
});
