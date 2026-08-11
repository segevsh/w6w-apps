import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/entity-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-create: POSTs the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "e-1" }) }]);
  const out = await action.execute({ type: "feature", fields: { name: "Awesome" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/entities");
  assertEquals(bodyOf(calls[0]), { data: { type: "feature", fields: { name: "Awesome" } } });
  assertEquals(out.data, { id: "e-1" });
});

Deno.test("entity-create: fields accepts a typed JSON string as well as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "e-1" }) }]);
  await action.execute({ type: "feature", fields: '{"name":"Typed"}' }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { type: "feature", fields: { name: "Typed" } } });
});

Deno.test("entity-create: relationships and metadata are omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ type: "feature", fields: { name: "x" } }, ctx);
  const data = (bodyOf(calls[0]) as { data: Record<string, unknown> }).data;
  assertEquals(Object.keys(data).sort(), ["fields", "type"]);
});

Deno.test("entity-create: malformed JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ type: "feature", fields: "{oops" }, ctx)),
    Error,
    "Fields is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("entity-create: is a non-idempotent perform — there is no idempotency key", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(action.description!.length > 0);
});
