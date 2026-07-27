import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("customer-create: POSTs /customers with only the required email", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  const result = await action.execute!({ email: "ada@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/customers");
  assertEquals(JSON.parse(calls[0].body!), { email: "ada@example.com" });
  assertEquals(result, { id: 1 });
});

Deno.test("customer-create: maps camelCase names and passes address objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }], { display });
  await action.execute!(
    {
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
      password: "secret",
      billing: { city: "London" },
      shipping: { city: "London" },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    username: "ada",
    password: "secret",
    billing: { city: "London" },
    shipping: { city: "London" },
  });
});
