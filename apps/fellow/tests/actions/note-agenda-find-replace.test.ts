import { assertEquals, assertRejects } from "@std/assert";
import noteAgendaFindReplace from "../../actions/note-agenda-find-replace.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-agenda-find-replace: POST /api/v1/note/n1/agenda/find-replace on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { agenda: { note_id: "n1", title: "T", content_fellow_markdown: "x" } },
  }]);
  const out = await noteAgendaFindReplace.execute({
    noteId: "n1",
    find: "TBD",
    contentFellowMarkdown: "Done",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/note/n1/agenda/find-replace");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), { find: "TBD", content_fellow_markdown: "Done" });
  assertEquals((out as { note_id: string }).note_id, "n1");
});

Deno.test("note-agenda-find-replace: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        noteAgendaFindReplace.execute(
          { noteId: "n1", find: "TBD", contentFellowMarkdown: "Done" },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
