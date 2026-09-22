import { assertEquals } from "@std/assert";

import createOrganization from "../../actions/create-organization.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("create-organization: POST /organizations with the {organization:{…}} body", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "o1" } }]);

  await createOrganization.execute(
    { name: "Acme", url: "https://acme.example.com", resume: "B2B SaaS", userId: "u1" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/organizations`);
  assertEquals(bodyOf(calls[0]), {
    organization: {
      name: "Acme",
      url: "https://acme.example.com",
      resume: "B2B SaaS",
      user_id: "u1",
    },
  });
});

Deno.test("create-organization: unset fields are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await createOrganization.execute({ name: "Acme" }, ctx);

  assertEquals(bodyOf(calls[0]), { organization: { name: "Acme" } });
});

Deno.test("create-organization: only the four documented fields are exposed", () => {
  const keys = (createOrganization.params ?? []).map((p) => p.key).sort();
  assertEquals(keys, ["name", "resume", "url", "userId"]);
  assertEquals(createOrganization.idempotent, false);
});
