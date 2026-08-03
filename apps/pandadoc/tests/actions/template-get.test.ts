import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: GETs /templates/{id}/details", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "t1",
      name: "MSA",
      roles: [{ id: "role1", name: "Client", signing_order: 1 }],
      tokens: [{ name: "Client.Company" }],
    },
  }]);
  const out = await action.execute({ templateId: "t1" }, ctx) as {
    roles: Array<{ name: string }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/templates/t1/details");
  // The roles here are what Create Document's recipients[].role must match.
  assertEquals(out.roles[0].name, "Client");
});

Deno.test("template-get: URL-encodes the template id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ templateId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/public/v1/templates/a%2Fb/details");
});

Deno.test("template-get: is a read action on the template resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "template");
});
