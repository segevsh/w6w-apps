import { assertEquals } from "@std/assert";
import contactNoteList from "../../actions/contact-note-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-note-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contact_notes") }]);
  await contactNoteList.execute({ contactId: "9", siteId: "111", sort: "-created_at" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contact_notes");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[contact_id]"], "9");
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["sort"], "-created_at");
});

Deno.test("contact-note-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contact_notes") }]);
  await contactNoteList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
