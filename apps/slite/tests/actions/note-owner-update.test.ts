import { assertEquals, assertRejects } from "@std/assert";
import noteOwnerUpdate from "../../actions/note-owner-update.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-owner-update: PUT /v1/notes/n1/owner with the documented parameters", async () => {
  const response = { id: "n1", owner: { groupId: "g1" } };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteOwnerUpdate.execute({ noteId: "n1", groupId: "g1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/owner");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { groupId: "g1" });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-owner-update: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await noteOwnerUpdate.execute({ noteId: "n1", groupId: "g1" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-owner-update: exactly one of userId / groupId is required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await noteOwnerUpdate.execute({ noteId: "n1", userId: "u1" }, ctx);
  assertEquals(calls[0].body, '{"userId":"u1"}');
  for (const input of [{ noteId: "n1" }, { noteId: "n1", userId: "u", groupId: "g" }]) {
    await assertRejects(
      async () => await noteOwnerUpdate.execute(input, ctx),
      Error,
      "exactly one",
    );
  }
  assertEquals(calls.length, 1);
});
