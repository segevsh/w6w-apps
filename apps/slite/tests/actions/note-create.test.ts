import { assertEquals, assertRejects } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-create: POST /v1/notes with the documented parameters", async () => {
  const response = { id: "n1", title: "Hello" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteCreate.execute({
    title: " Hello ",
    parentNoteId: "p1",
    markdown: "# Hi",
    attributes: "a, b",
    listPosition: "top",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/notes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    title: "Hello",
    parentNoteId: "p1",
    markdown: "# Hi",
    attributes: ["a", "b"],
    listPosition: "top",
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-create: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await noteCreate.execute({
        title: " Hello ",
        parentNoteId: "p1",
        markdown: "# Hi",
        attributes: "a, b",
        listPosition: "top",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-create: a blank title, or a bad listPosition, is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await noteCreate.execute({ title: "  " }, ctx), Error, "title");
  await assertRejects(
    async () => await noteCreate.execute({ title: "T", listPosition: "-3" }, ctx),
    Error,
    "listPosition",
  );
  assertEquals(calls.length, 0);
});

Deno.test("note-create: only the title is sent when nothing else is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await noteCreate.execute({ title: "T", markdown: "", templateId: "tpl" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null"), { title: "T", templateId: "tpl" });
});
