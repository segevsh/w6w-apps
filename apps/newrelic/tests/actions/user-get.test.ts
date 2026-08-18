import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: runs the cheapest query there is", async () => {
  const { ctx, calls } = mockCtx([
    ok({ actor: { user: { id: 1, name: "Ada", email: "a@b.c" } } }),
  ], { display });
  const result = await action.execute!({}, ctx) as { name: string; region: string };
  assertEquals(JSON.parse(calls[0].body!).query, "{ actor { user { id name email } } }");
  assertEquals(result.name, "Ada");
  assertEquals(result.region, "US");
});

Deno.test("user-get: reports the connection's region alongside", async () => {
  const { ctx } = mockCtx([ok({ actor: { user: { name: "Ada" } } })], {
    display: { region: "EU" },
  });
  const result = await action.execute!({}, ctx) as { region: string };
  assertEquals(result.region, "EU");
});

Deno.test("user-get: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** A user key carries exactly its user's permissions. */
Deno.test("user-get: says why the identity is the answer to what it can do", () => {
  assert(/exactly that person's permissions/.test(action.description!), action.description);
});
