import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/listbuilding-signin.ts";

Deno.test("listbuilding-signin: POSTs the contact and returns the redirect URL", async () => {
  const { ctx, calls } = mockCtx([{ body: ["https://klick.example.com/pending/1z3z"] }]);
  const out = await action.execute(
    { email: "a@example.com", fields: { fieldFirstName: "Alex" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/signin");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@example.com",
    fields: { fieldFirstName: "Alex" },
  });
  assertEquals(out, { redirectUrl: "https://klick.example.com/pending/1z3z" });
});

Deno.test("listbuilding-signin: the action never carries the key itself", async () => {
  const { ctx, calls } = mockCtx([{ body: ["u"] }]);
  await action.execute({ email: "a@example.com" }, ctx);
  assertEquals("apikey" in JSON.parse(calls[0].body!), false);
});

Deno.test("listbuilding-signin: error 100 means the key is invalid", async () => {
  const { ctx } = mockCtx([{
    status: 406,
    body: { error: 100, error_message: "Ungültiger API-Key." },
  }]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com" }, ctx),
    Error,
    "invalid API key",
  );
});

Deno.test("listbuilding-signin: needs an email or an SMS number", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "email or an SMS number");
});
