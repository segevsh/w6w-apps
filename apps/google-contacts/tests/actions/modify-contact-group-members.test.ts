import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/modify-contact-group-members.ts";

Deno.test("modify-contact-group-members: POSTs members:modify with normalised names", async () => {
  const { ctx, calls } = mockCtx([{ body: { notFoundResourceNames: [] } }]);
  const result = await action.execute({
    resourceName: "contactGroups/myContacts",
    resourceNamesToAdd: "c1, people/c2",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/contactGroups/myContacts/members:modify");
  assertEquals(JSON.parse(calls[0].body!), {
    resourceNamesToAdd: ["people/c1", "people/c2"],
  });
  assertEquals(result, { notFoundResourceNames: [] });
});

Deno.test("modify-contact-group-members: sends both lists when both are given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    resourceName: "1a",
    resourceNamesToAdd: ["people/c1"],
    resourceNamesToRemove: ["c2", "c3"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    resourceNamesToAdd: ["people/c1"],
    resourceNamesToRemove: ["people/c2", "people/c3"],
  });
});

Deno.test("modify-contact-group-members: omits the empty list rather than sending []", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "1a", resourceNamesToRemove: "c2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("resourceNamesToAdd" in body, false);
  assertEquals(body.resourceNamesToRemove, ["people/c2"]);
});

Deno.test("modify-contact-group-members: rejects a call that would do nothing", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ resourceName: "1a" }, ctx),
    Error,
    "at least one contact",
  );
  assertEquals(calls.length, 0);
});

Deno.test("modify-contact-group-members: enforces the 1000-name ceiling across BOTH lists", () => {
  const { ctx, calls } = mockCtx([]);
  const half = Array.from({ length: 500 }, (_, i) => `a${i}`);
  const overHalf = Array.from({ length: 501 }, (_, i) => `r${i}`);
  assertThrows(
    () =>
      action.execute({
        resourceName: "1a",
        resourceNamesToAdd: half,
        resourceNamesToRemove: overHalf,
      }, ctx),
    Error,
    "at most 1000 resource names",
  );
  assertEquals(calls.length, 0);
});

Deno.test("modify-contact-group-members: exactly 1000 across both lists is allowed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const half = Array.from({ length: 500 }, (_, i) => `a${i}`);
  const other = Array.from({ length: 500 }, (_, i) => `r${i}`);
  await action.execute({
    resourceName: "1a",
    resourceNamesToAdd: half,
    resourceNamesToRemove: other,
  }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("modify-contact-group-members: surfaces the partial-failure fields as output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys, ["notFoundResourceNames", "canNotRemoveLastContactGroupResourceNames"]);
  assertEquals(action.idempotent, true);
});
