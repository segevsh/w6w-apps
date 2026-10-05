import { assertEquals, assertRejects } from "@std/assert";
import contactTagRemove from "../../actions/contact-tag-remove.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "contactId": "x-contactId", "tagId": "x-tagId" };

Deno.test("contact-tag-remove: sends DELETE /contacts/{id}/tags/{tag_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await contactTagRemove.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/x-contactId/tags/x-tagId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("contact-tag-remove: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await contactTagRemove.execute({ "contactId": "x-contactId", "tagId": "x-tagId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("contact-tag-remove: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await contactTagRemove.execute({ ...INPUT, ...{ "contactId": "a/b", "tagId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("contact-tag-remove: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await contactTagRemove.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
