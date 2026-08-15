import { assertEquals } from "@std/assert";
import usersCreate from "../../actions/users-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("users-create: POSTs the required fields and maps camelCase params to the vendor's snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, email: "bob@example.com" } }]);
  const out = await usersCreate.execute(
    {
      first_name: "Bob",
      last_name: "Smith",
      email: "bob@example.com",
      affiliateCode: "abc123",
      sendWelcomeEmail: true,
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Bob");
  assertEquals(body.last_name, "Smith");
  assertEquals(body.email, "bob@example.com");
  assertEquals(body.affiliate_code, "abc123");
  assertEquals(body.send_welcome_email, true);
  assertEquals(out, { id: 1, email: "bob@example.com" });
});

Deno.test("users-create: omitted optional fields are dropped from the JSON body, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await usersCreate.execute({ first_name: "Bob", last_name: "Smith", email: "b@x.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("password" in body, false);
  assertEquals("roles" in body, false);
});

Deno.test("users-create: is not idempotent (creating twice makes two users)", () => {
  assertEquals(usersCreate.idempotent, false);
});
