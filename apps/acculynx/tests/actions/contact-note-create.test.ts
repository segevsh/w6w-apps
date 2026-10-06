import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-note-create.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-note-create: sends POST /contacts/c1/notes and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201 }]);
  const out = await action.execute(
    { contactId: "c1", note: "Called, left voicemail" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/c1/notes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { note: "Called, left voicemail" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { success: true });
});

Deno.test("contact-note-create: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute({ contactId: "c1", note: "Called, left voicemail" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
