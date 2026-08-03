import { assert, assertEquals } from "@std/assert";
import action from "../../actions/update-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-contact: PATCHes the contact with info and the concurrency revision", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: {} } }]);
  await action.execute!({ contactId: "c1", revision: 5, info: { company: "Wix" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/c1");
  assertEquals(JSON.parse(calls[0].body!), { info: { company: "Wix" }, revision: 5 });
});

Deno.test("update-contact: keeps revision 0, which is falsy but valid", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", revision: 0, info: {} }, ctx);
  assertEquals(JSON.parse(calls[0].body!).revision, 0);
});

Deno.test("update-contact: omits allowDuplicates unless set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", revision: 1, info: {} }, ctx);
  assert(!("allowDuplicates" in JSON.parse(calls[0].body!)));
});

Deno.test("update-contact: requires contactId, revision and info", () => {
  const required = action.params!.filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["contactId", "info", "revision"]);
});

Deno.test("update-contact: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
