import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/find-person-by-email.ts";

Deno.test("find-person-by-email: POSTs the address in the body, not the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, name: "Jim Halpert" } }]);
  const out = await action.execute({ email: "jim@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/fetch_by_email");
  assertEquals(JSON.parse(calls[0].body!), { email: "jim@example.com" });
  assertEquals(out, { id: 7, name: "Jim Halpert" });
  // The address must never end up in a URL segment.
  assert(!calls[0].url.includes("jim"));
});

Deno.test("find-person-by-email: is a read whose email param is the CONTACT's, not the credential's", () => {
  assertEquals(action.type, "read");
  const p = param(action, "email");
  assertEquals(p.required, true);
  assertEquals(p.type, "string");
  // Named `email`, not `userEmail` — the token owner's address lives on the
  // Connection and is stamped by `sign`.
  assert(!/user|owner|token/i.test(p.key));
});
