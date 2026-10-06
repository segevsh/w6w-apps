import { assertEquals, assertRejects } from "@std/assert";
import noteGet from "../../actions/note-get.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-get: GET /v1/notes/n%201 with the documented parameters", async () => {
  const response = { id: "n 1", content: "<p>x</p>" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteGet.execute({ noteId: "n 1", format: "html", css: "none" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n%201");
  assertEquals(queryOf(calls[0].url), { format: "html", css: "none" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-get: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await noteGet.execute({ noteId: "n 1", format: "html", css: "none" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-get: defaults send no format query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1", content: "x" } }]);
  await noteGet.execute({ noteId: "n1" }, ctx);
  assertEquals(calls[0].url, "https://api.slite.com/v1/notes/n1");
});
