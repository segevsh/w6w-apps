import { assertEquals } from "@std/assert";
import contactNoteCreate from "../../actions/contact-note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("contact-note-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactNoteCreate.execute({ "contactId": 7, "note": "x-note" } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/notes");
  assertEquals(JSON.parse(calls[0].body!), { "contactId": 7, "note": "x-note" });
  assertEquals(out, REPLY);
});

Deno.test("contact-note-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactNoteCreate.execute({ "contactId": 7, "note": "x-note" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "contactId": 7, "note": "x-note" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-note-create: declares a perform action's idempotency", () => {
  assertEquals(contactNoteCreate.type, "perform");
  assertEquals(contactNoteCreate.idempotent, false);
  assertEquals(contactNoteCreate.params!.filter((p) => p.required).map((p) => p.key), [
    "contactId",
    "note",
  ]);
});
