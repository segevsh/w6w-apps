import { assertEquals, assertRejects } from "@std/assert";
import legalHoldCreate from "../../actions/legal-hold-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("legal-hold-create: posts name, coverage and custodians", async () => {
  const hold = { id: "lgh_x", object: "legal_hold", custodian_count: 2 };
  const { ctx, calls } = mockCtx([{ status: 201, body: hold }]);
  const out = await legalHoldCreate.execute({
    name: "Matter 1",
    coversEntireWorkspace: false,
    description: "desc",
    emails: "a@x.com, b@x.com",
    userIds: "usr_a",
  }, ctx);
  assertEquals(out, hold);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Matter 1",
    covers_entire_workspace: false,
    description: "desc",
    custodians: [{ email: "a@x.com" }, { email: "b@x.com" }, { id: "usr_a" }],
  });
});

Deno.test("legal-hold-create: coverage is always sent, custodians and description omitted when empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await legalHoldCreate.execute({ name: "All", coversEntireWorkspace: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "All", covers_entire_workspace: true });
});

Deno.test("legal-hold-create: 409 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { code: "CONFLICT", message: "dup" } }]);
  await assertRejects(
    async () => await legalHoldCreate.execute({ name: "x", coversEntireWorkspace: false }, ctx),
    Error,
    "409",
  );
  assertEquals(legalHoldCreate.idempotent, false);
});
