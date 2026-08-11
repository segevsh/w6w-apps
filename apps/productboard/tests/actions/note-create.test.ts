import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/note-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-create: POSTs the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "n-1" }) }]);
  const out = await action.execute({
    type: "textNote",
    fields: { name: "New note", content: "Body" },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes");
  assertEquals(bodyOf(calls[0]), {
    data: { type: "textNote", fields: { name: "New note", content: "Body" } },
  });
  assertEquals(out.data, { id: "n-1" });
});

/**
 * The relationships array is passed through verbatim, including the vendor's
 * counter-intuitive `target.type: "link"` for a product link. Rewriting it to
 * the linked entity's type would produce a 422.
 */
Deno.test("note-create: relationships are forwarded exactly as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  const relationships = [
    { type: "customer", target: { type: "user", email: "u@example.com" } },
    { type: "link", target: { type: "link", id: "f-1" } },
  ];
  await action.execute({ type: "textNote", fields: { name: "x" }, relationships }, ctx);
  assertEquals(
    (bodyOf(calls[0]) as { data: { relationships: unknown } }).data.relationships,
    relationships,
  );
});

Deno.test("note-create: metadata is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ type: "textNote", fields: { name: "x" } }, ctx);
  const data = (bodyOf(calls[0]) as { data: Record<string, unknown> }).data;
  assertEquals(Object.keys(data).sort(), ["fields", "type"]);
});

Deno.test("note-create: missing fields is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ type: "textNote", fields: "" }, ctx)),
    Error,
    "Fields is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("note-create: is not idempotent, and says the customer must already exist", () => {
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("must already exist"), action.description!);
});
