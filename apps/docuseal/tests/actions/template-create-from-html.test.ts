import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-create-from-html.ts";

Deno.test("template-create-from-html: sends the html and name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "Test" } }]);
  await action.execute!({ html: "<p>Hi</p>", name: "Test" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/html");
  assertEquals(JSON.parse(calls[0].body!), { html: "<p>Hi</p>", name: "Test" });
});

/** `sharedLink` defaults to true on the wire, so leaving it unset omits the field. */
Deno.test("template-create-from-html: sharedLink is only sent when explicitly false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ html: "<p>Hi</p>", sharedLink: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { html: "<p>Hi</p>", shared_link: false });
});

Deno.test("template-create-from-html: a multi-document build parses its JSON array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ documents: '[{"name":"A","html":"<p>A</p>"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { documents: [{ name: "A", html: "<p>A</p>" }] });
});
