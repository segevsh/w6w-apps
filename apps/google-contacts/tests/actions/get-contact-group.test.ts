import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact-group.ts";

Deno.test("get-contact-group: GETs the group path", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "contactGroups/myContacts" } }]);
  const result = await action.execute({ resourceName: "contactGroups/myContacts" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/contactGroups/myContacts");
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(result, { resourceName: "contactGroups/myContacts" });
});

Deno.test("get-contact-group: accepts a bare group id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "starred" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/contactGroups/starred");
});

Deno.test("get-contact-group: forwards maxMembers, including an explicit 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ resourceName: "myContacts", maxMembers: 50 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("maxMembers"), "50");

  await action.execute({ resourceName: "myContacts", maxMembers: 0 }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("maxMembers"), "0");
});

Deno.test("get-contact-group: forwards groupFields as a joined mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "myContacts", groupFields: ["name", "clientData"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("groupFields"), "name,clientData");
});

Deno.test("get-contact-group: rejects an empty resourceName before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ resourceName: "" }, ctx), Error, "resourceName is required");
  assertEquals(calls.length, 0);
});
