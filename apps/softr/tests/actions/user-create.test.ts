import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { mockCtx, pathOf, STUDIO_API_ROOT } from "../_helpers.ts";

Deno.test("user-create: POSTs to /users on the Studio API host, with the Softr-Domain header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await userCreate.execute(
    { domain: "yourdomain.com", fullName: "John Richardson", email: "johnr@example.com" },
    ctx,
  );

  assertEquals(calls[0].url.startsWith(STUDIO_API_ROOT), true);
  assertEquals(pathOf(calls[0].url), "/v1/api/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["softr-domain"], "yourdomain.com");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    full_name: "John Richardson",
    email: "johnr@example.com",
  });
});

Deno.test("user-create: password and generateMagicLink are optional and snake_cased on the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userCreate.execute(
    {
      domain: "yourdomain.com",
      fullName: "Jane",
      email: "jane@example.com",
      password: "s3cret!!",
      generateMagicLink: true,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    full_name: "Jane",
    email: "jane@example.com",
    password: "s3cret!!",
    generate_magic_link: true,
  });
});

Deno.test("user-create: is explicitly not idempotent — retrying creates a duplicate user", () => {
  assertEquals(userCreate.idempotent, false);
});
