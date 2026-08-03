import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

Deno.test("client-create: sends only what was filled in", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientCreate: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ firstName: "Ada", lastName: "Lovelace" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    input: { firstName: "Ada", lastName: "Lovelace" },
  });
});

Deno.test("client-create: an email or phone becomes a primary entry in its list", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientCreate: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({
    firstName: "Ada",
    email: "ada@example.com",
    phone: "+15555550100",
    phoneDescription: "MOBILE",
    smsAllowed: true,
  }, ctx);
  const input = JSON.parse(calls[0].body!).variables.input;
  assertEquals(input.emails, [
    { address: "ada@example.com", description: "MAIN", primary: true },
  ]);
  assertEquals(input.phones, [
    { number: "+15555550100", description: "MOBILE", smsAllowed: true, primary: true },
  ]);
});

Deno.test("client-create: any address field creates the client's first property", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientCreate: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ firstName: "Ada", street1: "1 Main St", city: "Denver" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.properties, [
    { address: { street1: "1 Main St", city: "Denver" } },
  ]);
});

Deno.test("client-create: no address means no properties key at all", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientCreate: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ firstName: "Ada" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.properties, undefined);
});

Deno.test("client-create: a userErrors rejection at HTTP 200 throws", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        clientCreate: {
          client: null,
          userErrors: [{ message: "First name can't be blank", path: ["input", "firstName"] }],
        },
      },
    },
  }]);
  const err = await assertRejects(async () => await action.execute({}, ctx), Error);
  assert(err.message.includes("First name can't be blank"));
});

Deno.test("client-create: the mutation selects userErrors so the check is possible", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientCreate: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ firstName: "Ada" }, ctx);
  assert(JSON.parse(calls[0].body!).query.includes("userErrors { message path }"));
});
