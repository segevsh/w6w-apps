import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact-list.ts";

Deno.test("update-contact-list: PUTs /v3/contact_lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_id: "l1" } }]);
  await action.execute!({ listId: "l1", name: "Newsletter" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists/l1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Newsletter" });
});

Deno.test("update-contact-list: carries description and favorite", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    listId: "l1",
    name: "Newsletter",
    description: "monthly",
    favorite: false,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Newsletter",
    description: "monthly",
    favorite: false,
  });
});

Deno.test("update-contact-list: never sends membership fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", name: "Newsletter" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("contact_ids" in body, false);
  assertEquals("membership_count" in body, false);
});

Deno.test("update-contact-list: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
