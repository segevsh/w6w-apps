import { assertEquals, assertRejects } from "@std/assert";
import noteAgendaWrite from "../../actions/note-agenda-write.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-agenda-write: POST /api/v1/note/n1/agenda on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { agenda: { note_id: "n1", title: "T", content_fellow_markdown: "x" } },
  }]);
  const out = await noteAgendaWrite.execute({
    noteId: "n1",
    contentFellowMarkdown: "# Hi",
    title: "New",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/note/n1/agenda");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), { content_fellow_markdown: "# Hi", title: "New" });
  assertEquals((out as { note_id: string }).note_id, "n1");
});

Deno.test("note-agenda-write: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        noteAgendaWrite.execute({ noteId: "n1", contentFellowMarkdown: "# Hi", title: "New" }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
