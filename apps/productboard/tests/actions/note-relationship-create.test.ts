import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/note-relationship-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The trap this action exists to remove: for a product link, the vendor's
 * `LinkTargetById` schema declares `type: {enum: ["link"]}` — the literal
 * string "link", NOT the type of the entity being linked. The intuitive
 * `{"type": "feature"}` is rejected.
 */
Deno.test('note-relationship-create: a product link uses the literal target type "link"', async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ type: "link" }) }]);
  await action.execute({ noteId: "n-1", type: "link", targetId: "f-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1/relationships");
  assertEquals(bodyOf(calls[0]), {
    data: { type: "link", target: { type: "link", id: "f-1" } },
  });
});

Deno.test("note-relationship-create: a customer target keeps its real type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({
    noteId: "n-1",
    type: "customer",
    customerType: "company",
    targetId: "co-1",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    data: { type: "customer", target: { type: "company", id: "co-1" } },
  });
});

Deno.test("note-relationship-create: a customer may be addressed by email instead of id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ noteId: "n-1", type: "customer", targetEmail: "u@example.com" }, ctx);
  assertEquals(bodyOf(calls[0]), {
    data: { type: "customer", target: { type: "user", email: "u@example.com" } },
  });
});

Deno.test("note-relationship-create: neither an id nor an email is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ noteId: "n-1", type: "link" }, ctx)),
    Error,
    "Provide a Target ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("note-relationship-create: is idempotent — the same link twice is the same graph", () => {
  assertEquals(action.idempotent, true);
});
