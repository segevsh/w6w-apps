import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "contact", id: "1" } }]);
  const result = await action.execute!(
    { email: "a@b.com", name: "Ann", phone: "", customAttributes: { plan: "pro" } },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.intercom.io");
  assertEquals(url.pathname, "/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["intercom-version"], "2.11");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.com",
    name: "Ann",
    custom_attributes: { plan: "pro" },
  });
  assertEquals(result, { type: "contact", id: "1" });
});
