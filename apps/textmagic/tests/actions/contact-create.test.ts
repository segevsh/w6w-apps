import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-create: POSTs to /contacts/normalized", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 27074, href: "/api/v2/contacts/27074" },
  }]);
  const out = await contactCreate.execute({ phone: "447860021130", lists: "10541" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/normalized");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { phone: "447860021130", lists: "10541" });
  assertEquals(out, { id: 27074, href: "/api/v2/contacts/27074" });
});

test("contact-create: requires both phone and lists", () => {
  const params = contactCreate.params ?? [];
  const required = params.filter((p) => p.required).map((p) => p.key);
  assert(required.includes("phone"));
  assert(required.includes("lists"));
});
