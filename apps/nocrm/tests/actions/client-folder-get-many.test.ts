import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/client-folder-get-many.ts";

Deno.test("client-folder-get-many: sends order and direction", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 12, name: "Acme" }] }]);
  const page = await action.execute({ order: "id", direction: "asc" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/clients?direction=asc&order=id");
  assertEquals(page.items, [{ id: 12, name: "Acme" }]);
});

Deno.test("client-folder-get-many: no params at all when the caller sets none", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/clients");
});
