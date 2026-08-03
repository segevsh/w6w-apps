import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: GETs one template by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { templateId: "t1", name: "NDA" } }]);
  const out = await action.execute({ templateId: "t1" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/templates/t1`);
  assertEquals(out.name, "NDA");
});

Deno.test("template-get: passes include so role names can be read", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ templateId: "t1", include: "recipients" }, ctx);
  assertEquals(queryOf(calls[0]).get("include"), "recipients");
});

Deno.test("template-get: URL-encodes the template id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ templateId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/templates/a%2Fb`);
});

Deno.test("template-get: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.find((p) => p.key === "templateId")?.required, true);
});
