import { assertEquals } from "@std/assert";
import action from "../../actions/create-template.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-template: POSTs /v1/templates with wire names", async () => {
  const resp = { data: { id: "t1", name: "Welcome" } };
  const { ctx, calls } = mockCtx([{ status: 201, body: resp }]);
  const out = await exec(action, {
    html: "<p>hi</p>",
    text: "hi",
    name: "Welcome",
    domainId: "d1",
    categories: ["c1"],
    tags: "a,b",
    autoGenerate: false,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/templates");
  assertEquals(bodyOf(calls[0]), {
    html: "<p>hi</p>",
    text: "hi",
    name: "Welcome",
    domain_id: "d1",
    categories: ["c1"],
    tags: ["a", "b"],
    auto_generate: false,
  });
  assertEquals(out, resp);
});

Deno.test("create-template: html alone is a valid minimal body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await exec(action, { html: "<p>x</p>", autoGenerate: true }, ctx);
  assertEquals(bodyOf(calls[0]), { html: "<p>x</p>", auto_generate: true });
});
