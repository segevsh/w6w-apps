import { assert, assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-create: posts to /user, coercing booleans to 1/0", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, email: "new@kvcore.com" } }]);
  await userCreate.execute({ email: "new@kvcore.com", status: true, company_admin: false }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/user");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "new@kvcore.com",
    status: 1,
    company_admin: 0,
  });
});

Deno.test("user-create: only email is required", () => {
  const required = (userCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["email"]);
});

Deno.test("user-create: primary_office_id is offered (create-only field)", () => {
  assert((userCreate.params ?? []).some((p) => p.key === "primary_office_id"));
});
