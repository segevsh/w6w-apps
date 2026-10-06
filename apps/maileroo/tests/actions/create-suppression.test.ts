import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-suppression.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("create-suppression: POSTs email_address and reason", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: 7, email_address: "a@x.com", reason: "Unsub" } },
  }]);
  const out = await run(action, { emailAddress: " a@x.com ", reason: "Unsub" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/suppressions");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "a@x.com", reason: "Unsub" });
  assertEquals(out, { id: 7, emailAddress: "a@x.com", reason: "Unsub" });
});

Deno.test("create-suppression: requires an address; the reason is optional", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: 8, email_address: "b@x.com" } },
  }]);
  await assertRejects(
    () => run(action, { emailAddress: "" }, ctx),
    Error,
    "emailAddress is required",
  );
  await run(action, { emailAddress: "b@x.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email_address: "b@x.com" });
});
