import { assertEquals, assertRejects } from "@std/assert";
import contactTagAdd from "../../actions/contact-tag-add.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "contactId": "x-contactId",
  "tagId": "x-tagId",
  "include": ["user", "action_suggestions"],
  "maxActionSuggestions": 5,
  "maxWorkspaces": 5,
  "maxTags": 5,
  "maxCustomFields": 5,
};

Deno.test("contact-tag-add: sends PUT /contacts/{id}/tags/{tag_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await contactTagAdd.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/x-contactId/tags/x-tagId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "include": ["user", "action_suggestions"],
    "max_action_suggestions": 5,
    "max_workspaces": 5,
    "max_tags": 5,
    "max_custom_fields": 5,
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("contact-tag-add: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await contactTagAdd.execute({ "contactId": "x-contactId", "tagId": "x-tagId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("contact-tag-add: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await contactTagAdd.execute({ ...INPUT, ...{ "contactId": "a/b", "tagId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("contact-tag-add: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await contactTagAdd.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
