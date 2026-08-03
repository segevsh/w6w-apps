import { assertEquals } from "@std/assert";
import action from "../../actions/unlabel-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("unlabel-contact: DELETEs with the label keys in a JSON body, as Wix documents", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: {} } }]);
  await action.execute!({ contactId: "c1", labelKeys: "custom.a,custom.b" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/c1/labels");
  assertEquals(JSON.parse(calls[0].body!), { labelKeys: ["custom.a", "custom.b"] });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("unlabel-contact: trims and drops empty entries", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", labelKeys: " custom.a ,, " }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labelKeys, ["custom.a"]);
});

Deno.test("unlabel-contact: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
