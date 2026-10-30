import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactAddNote from "../../actions/contact-add-note.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("contact-add-note: POST /v1/contacts/{contactId}/note/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const result = await contactAddNote.execute({
    contactId: "42",
    name: "Call",
    comment: "Left a voicemail",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42/note/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].isFormData, true);
  assertEquals(Object.fromEntries(calls[0].form!.entries()), {
    name: "Call",
    comment: "Left a voicemail",
  });
  assertEquals(result, { status: "ok" });
});

test("contact-add-note: declares type perform", () => {
  assertEquals(contactAddNote.type, "perform");
  assertEquals(contactAddNote.idempotent, false);
});

test("contact-add-note: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactAddNote.execute(
      { contactId: "42", name: "Call", comment: "Left a voicemail" },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
