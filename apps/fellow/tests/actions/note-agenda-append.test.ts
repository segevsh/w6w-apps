import { assertEquals, assertRejects } from "@std/assert";
import noteAgendaAppend from "../../actions/note-agenda-append.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-agenda-append: POST /api/v1/note/n1/agenda/append on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { agenda: { note_id: "n1", title: "T", content_fellow_markdown: "x" } },
  }]);
  const out = await noteAgendaAppend.execute(
    { noteId: "n1", contentFellowMarkdown: "- more" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/note/n1/agenda/append");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), { content_fellow_markdown: "- more" });
  assertEquals((out as { note_id: string }).note_id, "n1");
});

Deno.test("note-agenda-append: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        noteAgendaAppend.execute({ noteId: "n1", contentFellowMarkdown: "- more" }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
