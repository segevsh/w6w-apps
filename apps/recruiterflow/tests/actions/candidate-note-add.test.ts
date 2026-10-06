import { assertEquals } from "@std/assert";
import candidateNoteAdd from "../../actions/candidate-note-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-note-add: POST /candidate/notes/add with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateNoteAdd.execute(
    { "id": 42, "value": "Great call", "createdBy": 3 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/notes/add");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "id": 42,
    "value": "Great call",
    "created_by": 3,
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-note-add: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateNoteAdd.execute(
      { "id": 42, "value": "Great call", "createdBy": 3 } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
