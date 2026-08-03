import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import checkDuplicate from "../../actions/check-duplicate.ts";

Deno.test("check-duplicate: GETs /people/checkDuplicate with email and phone", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { found: true, matchedBy: "email", assignedTo: "Agent Smith" },
  }]);
  const result = await run<{ found: boolean }>(
    checkDuplicate,
    { email: "a@example.com", phone: "555" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people/checkDuplicate");
  assertEquals(url.searchParams.get("email"), "a@example.com");
  assertEquals(url.searchParams.get("phone"), "555");
  assertEquals(result.found, true);
});

/** Its whole value is answering account-wide, past the key's own visibility. */

/** Its whole value is answering account-wide, past the key's own visibility. */
Deno.test("check-duplicate: explains why it beats a scoped search", () => {
  assertEquals(checkDuplicate.type, "read");
  assert(/account-wide|cannot otherwise see/i.test(checkDuplicate.description!));
});
