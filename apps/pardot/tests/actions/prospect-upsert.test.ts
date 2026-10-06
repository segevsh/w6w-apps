import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-upsert.ts";

Deno.test("prospect-upsert: POSTs matchEmail, prospect and a fields ARRAY to do/upsertLatestByEmail", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { id: 345, email: "tony@stark.com" } }]);
  const out = await action.execute(
    {
      email: "tony@stark.com",
      matchEmail: "tony@avengers.com",
      firstName: "Tony",
      fields: "id, email,firstName",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/prospects/do/upsertLatestByEmail");
  assertEquals(JSON.parse(calls[0].body!), {
    matchEmail: "tony@avengers.com",
    prospect: { email: "tony@stark.com", firstName: "Tony" },
    fields: ["id", "email", "firstName"],
  });
  assertEquals(out, { id: 345, email: "tony@stark.com" });
});

Deno.test("prospect-upsert: fields default to id and email; matchEmail is omitted when blank", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { id: 1 } }]);
  await action.execute({ email: "a@b.com", matchEmail: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    prospect: { email: "a@b.com" },
    fields: ["id", "email"],
  });
});

Deno.test("prospect-upsert: requires an email", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(async () => await action.execute({ email: "" }, ctx), Error, "email");
  assertEquals(calls.length, 0);
});
