import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import addNote from "../../actions/add-note.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

test("add-note: is a non-idempotent perform action", () => {
  assertEquals(addNote.type, "perform");
  assertEquals(addNote.idempotent, false);
});

test("add-note: calls newNote with the entity object and a plain-string note", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 99 } }]);
  const result = await addNote.execute({
    entityType: "Leads",
    entityId: "42",
    note: "Called back, interested",
  }, ctx);

  assertEquals(rpcBody(calls[0]).method, "newNote");
  assertEquals(rpcBody(calls[0]).params, {
    entity: { entityType: "Leads", id: 42 },
    note: "Called back, interested",
  });
  assertEquals(result.id, 99);
});
