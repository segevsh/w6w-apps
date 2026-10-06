import { assertEquals, assertRejects } from "@std/assert";
import noteUpdate from "../../actions/note-update.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-update: PUT /v1/notes/n1 with the documented parameters", async () => {
  const response = { id: "n1", title: "T" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteUpdate.execute({
    noteId: "n1",
    title: "T",
    html: "<p>x</p>",
    listPosition: "5",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    title: "T",
    html: "<p>x</p>",
    listPosition: 5,
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-update: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await noteUpdate.execute(
        { noteId: "n1", title: "T", html: "<p>x</p>", listPosition: "5" },
        ctx,
      ),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-update: sends only what was given; 'bottom' passes through", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await noteUpdate.execute({ noteId: "n1", listPosition: "bottom" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null"), { listPosition: "bottom" });
});
