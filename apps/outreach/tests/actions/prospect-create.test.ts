import { assertEquals, assertRejects } from "@std/assert";
import prospectCreate from "../../actions/prospect-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("prospect-create: POSTs a JSON:API prospect with attributes and relationships", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("prospect", 9, { firstName: "Jane" }),
  }]);
  const out = await prospectCreate.execute({
    firstName: "Jane",
    lastName: "Doe",
    emails: ["jane@acme.com"],
    accountId: 3,
    ownerId: "4",
  }, ctx) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/prospects");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "prospect",
      attributes: { firstName: "Jane", lastName: "Doe", emails: ["jane@acme.com"] },
      relationships: {
        account: { data: { type: "account", id: 3 } },
        owner: { data: { type: "user", id: 4 } },
      },
    },
  });
  assertEquals(out.data.id, 9);
});

Deno.test("prospect-create: the attributes escape hatch merges, and a named field wins", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("prospect", 1) }]);
  await prospectCreate.execute({
    firstName: "Named",
    attributes: { firstName: "Loser", custom1: "x" },
  }, ctx);
  assertEquals(bodyOf(calls[0]).data.attributes, { firstName: "Named", custom1: "x" });
});

Deno.test("prospect-create: blank fields are not sent and no id is in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("prospect", 1) }]);
  await prospectCreate.execute({ firstName: "", lastName: "Only" }, ctx);
  const data = bodyOf(calls[0]).data;
  assertEquals(data.attributes, { lastName: "Only" });
  assertEquals("id" in data, false);
});

Deno.test("prospect-create: is not declared idempotent", () => {
  assertEquals(prospectCreate.idempotent, false);
});

Deno.test("prospect-create: a bad relationship id is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await prospectCreate.execute({ accountId: "abc" }, ctx),
    Error,
    "accountId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("prospect-create: 422 validation errors carry the field pointer", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      errors: [{
        id: "validationError",
        title: "Validation Error",
        detail: "Emails is invalid.",
        source: { pointer: "/data/attributes/emails" },
      }],
    },
  }]);
  await assertRejects(
    async () => await prospectCreate.execute({ emails: ["nope"] }, ctx),
    Error,
    "(/data/attributes/emails)",
  );
});
