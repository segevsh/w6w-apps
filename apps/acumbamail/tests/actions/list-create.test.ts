import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import listCreate from "../../actions/list-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("list-create: POST /api/1/createList/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  const out = await listCreate.execute(
    {
      "name": "Newsletter",
      "sender_email": "me@example.com",
      "company": "Acme",
      "country": "Spain",
      "city": "Madrid",
      "address": "1 Main St",
      "phone": "+34123456789",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/createList/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "name": "Newsletter",
    "sender_email": "me@example.com",
    "company": "Acme",
    "country": "Spain",
    "city": "Madrid",
    "address": "1 Main St",
    "phone": "+34123456789",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { id: "123" });
});

test("list-create: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await listCreate.execute(
      {
        "name": "Newsletter",
        "sender_email": "me@example.com",
        "company": "Acme",
        "country": "Spain",
        "city": "Madrid",
        "address": "1 Main St",
        "phone": "+34123456789",
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

test("list-create: an empty name fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await listCreate.execute(
        {
          "name": "  ",
          "sender_email": "me@example.com",
          "company": "Acme",
          "country": "Spain",
          "city": "Madrid",
          "address": "1 Main St",
          "phone": "+34123456789",
        } as never,
        ctx,
      ),
    Error,
    "name is required",
  );
  assertEquals(calls.length, 0);
});

test("list-create: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  await listCreate.execute(
    { "name": "Newsletter", "sender_email": "me@example.com" } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), { "name": "Newsletter", "sender_email": "me@example.com" });
});
