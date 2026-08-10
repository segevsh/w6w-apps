import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-delete.ts";

Deno.test("object-delete: builds a single deleteObject request", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1", replies: [{}] } }]);
  await action.execute({ presentationId: "p1", objectId: "g1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ deleteObject: { objectId: "g1" } }],
  });
});

Deno.test("object-delete: forwards the revision guard", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", objectId: "g1", requiredRevisionId: "r1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).writeControl, { requiredRevisionId: "r1" });
});

Deno.test("object-delete: is non-idempotent — a repeat delete 400s", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("object-delete: a non-2xx surfaces as an error, never as success", async () => {
  const { ctx } = mockCtx([{ status: 400, statusText: "Bad Request", body: '{"error":{}}' }]);
  let threw = false;
  try {
    await action.execute({ presentationId: "p1", objectId: "gone" }, ctx);
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.startsWith("Google Slides 400"), true);
  }
  assertEquals(threw, true);
});
