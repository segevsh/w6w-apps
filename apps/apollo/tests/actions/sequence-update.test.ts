import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sequenceUpdate from "../../actions/sequence-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("sequence-update: PUTs /sequences/{id} and returns the response as-is (no envelope key)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "seq1", name: "New Name", active: true } }]);
  const out = await sequenceUpdate.execute({ id: "seq1", name: "New Name" }, ctx) as {
    sequence: { name: string };
  };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/sequences/seq1");
  assertEquals(out.sequence.name, "New Name");
});

test("sequence-update: idempotent", () => {
  assertEquals(sequenceUpdate.idempotent, true);
});
