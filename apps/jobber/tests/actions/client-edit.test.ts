import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-edit.ts";

Deno.test("client-edit: appends contacts through the *ToAdd lists, never a replacement array", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientEdit: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({
    clientId: "c1",
    emailToAdd: "new@example.com",
    phoneToAdd: "+15555550111",
    tagsToAdd: "vip",
    tagsToDelete: "cold, stale",
  }, ctx);
  const input = JSON.parse(calls[0].body!).variables.input;
  assertEquals(input.emailsToAdd, [
    { address: "new@example.com", description: "MAIN", primary: false },
  ]);
  assertEquals(input.phonesToAdd, [
    { number: "+15555550111", description: "MAIN", primary: false },
  ]);
  assertEquals(input.tagsToAdd, ["vip"]);
  assertEquals(input.tagsToDelete, ["cold", "stale"]);
  // ClientEditInput has no `emails` / `phones` field — sending one is a schema error.
  assertEquals(input.emails, undefined);
  assertEquals(input.phones, undefined);
});

Deno.test("client-edit: an untouched field is absent, not null", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientEdit: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ clientId: "c1", firstName: "Ada" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    clientId: "c1",
    input: { firstName: "Ada" },
  });
});

Deno.test("client-edit: any billing field sends a billing address", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientEdit: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ clientId: "c1", billingCity: "Denver" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.billingAddress, { city: "Denver" });
});

Deno.test("client-edit: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { clientEdit: { client: null, userErrors: [{ message: "Client is archived" }] } },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ clientId: "c1" }, ctx),
    Error,
    "Client is archived",
  );
});
