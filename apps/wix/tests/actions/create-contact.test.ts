import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-contact: builds Wix's nested `info` from the flat convenience fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: "c1" } } }]);
  await action.execute!({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+15551234567",
    company: "Analytical Engines",
    jobTitle: "Mathematician",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    info: {
      name: { first: "Ada", last: "Lovelace" },
      emails: { items: [{ email: "ada@example.com", primary: true }] },
      phones: { items: [{ phone: "+15551234567", primary: true }] },
      company: "Analytical Engines",
      jobTitle: "Mathematician",
    },
  });
});

Deno.test("create-contact: splits labelKeys into the `labelKeys.items` wrapper", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ email: "a@b.com", labelKeys: "custom.vip, custom.news" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).info.labelKeys,
    { items: ["custom.vip", "custom.news"] },
  );
});

Deno.test("create-contact: omits every section the caller left blank", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ email: "a@b.com" }, ctx);
  const info = JSON.parse(calls[0].body!).info;
  assertEquals(Object.keys(info), ["emails"]);
});

Deno.test("create-contact: a raw `info` object wins over the convenience fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    firstName: "Ignored",
    info: { name: { first: "Explicit" }, addresses: { items: [] } },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).info, {
    name: { first: "Explicit" },
    addresses: { items: [] },
  });
});

Deno.test("create-contact: sends allowDuplicates only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ email: "a@b.com" }, ctx);
  assert(!("allowDuplicates" in JSON.parse(calls[0].body!)));
  await action.execute!({ email: "a@b.com", allowDuplicates: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!).allowDuplicates, true);
});

Deno.test("create-contact: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
