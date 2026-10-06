import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-create: POSTs JSON to /notes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { description: "Call back" } }]);
  await action.execute({
    description: "Call back",
    relatedTo: " 23123 ",
    relatedToType: "candidate",
    noteTypeId: 1,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    description: "Call back",
    related_to: "23123",
    related_to_type: "candidate",
    note_type_id: 1,
  });
});

Deno.test("note-create: validates required fields before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const base = { description: "x", relatedTo: "1", relatedToType: "job" };
  await assertRejects(
    async () => await (action.execute({ ...base, description: " " }, ctx)),
    Error,
    "description",
  );
  await assertRejects(
    async () => await (action.execute({ ...base, relatedTo: "" }, ctx)),
    Error,
    "relatedTo",
  );
  await assertRejects(
    async () => await (action.execute({ ...base, relatedToType: "" }, ctx)),
    Error,
    "relatedToType",
  );
  assertEquals(calls.length, 0);
});
