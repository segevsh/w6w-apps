import { assertEquals } from "@std/assert";
import contactNoteList from "../../actions/contact-note-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("contact-note-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactNoteList.execute(
    { "contactId": 7, "limit": 7, "page": 7 } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/notes");
  assertEquals(queryOf(calls[0].url), { "contactId": "7", "limit": "7", "page": "7" });
  assertEquals(out, REPLY);
});

Deno.test("contact-note-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactNoteList.execute({ "contactId": 7 } as never, ctx);

  assertEquals(queryOf(calls[0].url), { "contactId": "7" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-note-list: declares a read-only shape", () => {
  assertEquals(contactNoteList.type, "read");
  assertEquals(contactNoteList.idempotent, undefined);
  assertEquals(contactNoteList.params!.filter((p) => p.required).map((p) => p.key), ["contactId"]);
});
