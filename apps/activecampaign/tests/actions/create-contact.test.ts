import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs /contacts wrapped in a `contact` envelope", async () => {
  const body = { contact: { id: "1" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute(
    { email: "a@b.com", firstName: "Ada", fieldValues: [{ field: "1", value: "x" }] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/3/contacts");
  assertEquals(
    JSON.parse(calls[0].body!),
    { contact: { email: "a@b.com", firstName: "Ada", fieldValues: [{ field: "1", value: "x" }] } },
  );
  assertEquals(result, body);
});

Deno.test("create-contact: drops unset fields rather than sending nulls", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ body: { contact: {} } }]);
  await action.execute({ email: "a@b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact: { email: "a@b.com" } });
});
