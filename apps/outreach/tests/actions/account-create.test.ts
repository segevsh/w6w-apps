import { assertEquals } from "@std/assert";
import accountCreate from "../../actions/account-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("account-create: POSTs a JSON:API account", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("account", 5, { name: "Acme" }) }]);
  const out = await accountCreate.execute({
    name: "Acme",
    domain: "acme.com",
    numberOfEmployees: 120,
    tags: ["Enterprise"],
    ownerId: 8,
  }, ctx) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "account",
      attributes: {
        name: "Acme",
        domain: "acme.com",
        numberOfEmployees: 120,
        tags: ["Enterprise"],
      },
      relationships: { owner: { data: { type: "user", id: 8 } } },
    },
  });
  assertEquals(out.data.id, 5);
});

Deno.test("account-create: a numeric 0 attribute is still sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("account", 1) }]);
  await accountCreate.execute({ numberOfEmployees: 0 }, ctx);
  assertEquals(bodyOf(calls[0]).data.attributes, { numberOfEmployees: 0 });
});
