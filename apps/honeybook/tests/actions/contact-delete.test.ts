import { assertEquals, assertRejects } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "contactId": "x-contactId", "reactionText": "x-reactionText" };

Deno.test("contact-delete: sends DELETE /contacts/{id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await contactDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/x-contactId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { "reaction_text": "x-reactionText" });
  assertEquals(out, { success: true });
});

Deno.test("contact-delete: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await contactDelete.execute({ "contactId": "x-contactId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("contact-delete: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await contactDelete.execute({ ...INPUT, ...{ "contactId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("contact-delete: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await contactDelete.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
