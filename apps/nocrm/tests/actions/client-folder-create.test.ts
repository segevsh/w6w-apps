import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/client-folder-create.ts";

Deno.test("client-folder-create: POSTs the required name", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: { id: 12 } }]);
  await action.execute({ name: "Acme" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});

Deno.test("client-folder-create: maps the optional description and owner", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Acme", description: "key account", userId: "514" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    description: "key account",
    user_id: "514",
  });
});

Deno.test("client-folder-create: an unknown assignee surfaces user_not_found", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 400,
    body: { error: 400, message: "User not found", type: "user_not_found" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ name: "Acme", userId: "nobody" }, ctx)),
    Error,
    "user_not_found",
  );
});
