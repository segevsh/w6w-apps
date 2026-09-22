import { assert, assertEquals } from "@std/assert";
import action from "../../actions/update-client-record.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

const updated = { id: "rec-1", isActive: false, dateModified: "2026-09-22T10:00:00Z" };

Deno.test("update-client-record: PUTs to /consultant/records/{recordId}", async () => {
  const { ctx, calls } = mockCtx([{ body: updated }]);
  const result = await action.execute({
    recordId: "rec-1",
    isActive: false,
    pinned: true,
    profile: { emailAddress: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/records/rec-1`);
  const body = bodyOf(calls[0]);
  assertEquals(body.isActive, false);
  assertEquals(body.pinned, true);
  assertEquals(body.profile, {
    emailAddress: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
  });
  assertEquals(result, updated);
});

Deno.test("update-client-record: a partial body is exactly what the caller asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: updated }]);
  await action.execute({ recordId: "rec-1", isActive: false }, ctx);
  // The omission is deliberate and dangerous, so the body is asserted verbatim:
  // the API erases every field a PUT does not carry.
  assertEquals(Object.keys(bodyOf(calls[0])), ["isActive"]);
});

Deno.test("update-client-record: an invalid profile string is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ recordId: "rec-1", profile: "{not json" }, ctx);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message, "profile is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("update-client-record: the full-replace warning is in the description", () => {
  assert(/FULL REPLACE/i.test(action.description!), action.description);
  assert(/erased/i.test(action.description!), action.description);
  assert(/get-client-record/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
  assertEquals(action.type, "perform");
});
