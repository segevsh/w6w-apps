import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-create.ts";

Deno.test("prospect-create: POSTs the prospect with fields as a query parameter", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 201, body: { id: 5, email: "a@b.com" } }]);
  const out = await action.execute(
    { email: "a@b.com", firstName: "Ann", score: 10, isDoNotEmail: false, campaignId: 7 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v5/objects/prospects");
  assertEquals(url.searchParams.get("fields")!.startsWith("id,email"), true);
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.com",
    firstName: "Ann",
    campaignId: 7,
    score: 10,
    isDoNotEmail: false,
  });
  assertEquals(out, { id: 5, email: "a@b.com" });
});

Deno.test("prospect-create: additionalFields (custom __c fields) merge into the body", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 201, body: { id: 5 } }]);
  await action.execute(
    {
      email: "a@b.com",
      company: "Acme",
      additionalFields: '{"Food_Preference__c":"Vegan","company":"Wins"}',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.com",
    company: "Wins",
    Food_Preference__c: "Vegan",
  });
});

Deno.test("prospect-create: a 204 (created, not viewable) still reports success", async () => {
  const { ctx } = mockPardotCtx([{ status: 204 }]);
  assertEquals(await action.execute({ email: "a@b.com" }, ctx), { created: true });
});

Deno.test("prospect-create: refuses a missing email and a non-object additionalFields", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(async () => await action.execute({ email: "" }, ctx), Error, "email");
  await assertRejects(
    async () => await action.execute({ email: "a@b.com", additionalFields: "[1]" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("prospect-create: surfaces a vendor error with its code", async () => {
  const { ctx } = mockPardotCtx([{
    status: 400,
    body: { code: 4, message: "Invalid email address" },
  }]);
  await assertRejects(
    async () => await action.execute({ email: "nope" }, ctx),
    Error,
    "[4] Invalid email address",
  );
});
