import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact-group.ts";

Deno.test("create-contact-group: POSTs the group in the BODY, with the mask beside it", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "contactGroups/1a", name: "Team" } }]);
  const result = await action.execute({ name: "Team" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/contactGroups");
  // Unlike the people methods, contactGroups carries its masks in the body.
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(JSON.parse(calls[0].body!), { contactGroup: { name: "Team" } });
  assertEquals(result, { resourceName: "contactGroups/1a", name: "Team" });
});

Deno.test("create-contact-group: includes readGroupFields in the body when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "Team", readGroupFields: ["name", "groupType"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    contactGroup: { name: "Team" },
    readGroupFields: "name,groupType",
  });
});

Deno.test("create-contact-group: attaches clientData when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "Team", clientData: [{ key: "src", value: "w6w" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    contactGroup: { name: "Team", clientData: [{ key: "src", value: "w6w" }] },
  });
});

Deno.test("create-contact-group: rejects a blank name before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ name: "   " }, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
});

Deno.test("create-contact-group: is non-idempotent — a duplicate name is a 409", () => {
  assertEquals(action.idempotent, false);
});
