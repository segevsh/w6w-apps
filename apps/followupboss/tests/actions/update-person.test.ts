import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import updatePerson from "../../actions/update-person.ts";

Deno.test("update-person: PUTs /people/{id} with mergeTags on the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 123 } }]);
  await updatePerson.execute({ id: 123, tags: ["VIP"], mergeTags: true, stage: "Buyer" }, ctx);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people/123");
  assertEquals(url.searchParams.get("mergeTags"), "true");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["VIP"], stage: "Buyer" });
});

/**
 * The data-loss guard. An untouched field must be omitted, never sent as null —
 * `tags` and `phones` REPLACE on this endpoint, so a stray null clears them.
 */

/**
 * The data-loss guard. An untouched field must be omitted, never sent as null —
 * `tags` and `phones` REPLACE on this endpoint, so a stray null clears them.
 */
Deno.test("update-person: omits untouched fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 123 } }]);
  await updatePerson.execute({ id: 123, firstName: "Mary" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Mary" });
  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("mergeTags"), "mergeTags leaked when unset");
});

/** `source`/`sourceUrl` cannot be changed after creation, so offering them would lie. */

/** `source`/`sourceUrl` cannot be changed after creation, so offering them would lie. */
Deno.test("update-person: does not offer the write-once source fields", () => {
  const keys = (updatePerson.params ?? []).map((p) => p.key);
  assert(!keys.includes("source"), "source is write-once and must not be offered on update");
  assert(!keys.includes("sourceUrl"), "sourceUrl is write-once and must not be offered on update");
});

Deno.test("update-person: warns about replace-semantics and the contacted side effect", () => {
  assertEquals(updatePerson.idempotent, true);
  assert(/REPLACE/i.test(updatePerson.description!), updatePerson.description);
  assert(param(updatePerson, "tags").hint?.includes("Replaces"));
  assert(param(updatePerson, "phones").hint?.includes("Replaces"));
  assert(param(updatePerson, "contacted").hint?.includes("pauses"));
});
