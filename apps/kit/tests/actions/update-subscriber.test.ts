import { assert, assertEquals } from "@std/assert";
import action from "../../actions/update-subscriber.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-subscriber: PUTs /v4/subscribers/{id} with the required email", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: { id: 357 } } }]);
  await action.execute!({ subscriberId: 357, emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/subscribers/357");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("update-subscriber: includes firstName and fields when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: {} } }]);
  await action.execute!({
    subscriberId: 357,
    emailAddress: "ada@example.com",
    firstName: "Ada",
    fields: { last_name: "Lovelace" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    email_address: "ada@example.com",
    first_name: "Ada",
    fields: { last_name: "Lovelace" },
  });
});

Deno.test("update-subscriber: does not send a `state` — Kit rejects state changes here", () => {
  assert(!action.params?.some((p) => p.key === "state"));
});
