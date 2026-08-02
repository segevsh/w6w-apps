import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs /contacts/ with locationId and the given fields", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { status: 201, body: { contact: { id: "c1" } } },
  ], "loc-1");
  await action.execute!({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    tags: "vip, newsletter",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.locationId, "loc-1");
  assertEquals(body.firstName, "Ada");
  assertEquals(body.email, "ada@example.com");
  assertEquals(body.tags, ["vip", "newsletter"]);
});

Deno.test("create-contact: merges additionalFields into the payload", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ status: 201, body: { contact: {} } }]);
  await action.execute!({
    email: "a@b.com",
    additionalFields: { customFields: [{ id: "cf1", value: "gold" }] },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customFields, [{ id: "cf1", value: "gold" }]);
});
