import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/vault-list.ts";

Deno.test("vault-list: returns the vaults the token can reach", async () => {
  const { ctx, calls } = mockCtx([
    ok([{ id: "v1", name: "Prod", items: 12 }, { id: "v2", name: "Staging", items: 3 }]),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number; ids: string[] };
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults");
  assertEquals(result.count, 2);
  assertEquals(result.ids, ["v1", "v2"]);
});

/** A vault name describes what is in it. */
Deno.test("vault-list: logs a count, never a vault name", async () => {
  const { ctx, logs } = mockCtx([ok([{ id: "v1", name: "Production secrets" }])], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Production"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("vault-list: a token scoped to nothing is a count of zero", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("vault-list: an Events connection is refused", async () => {
  const { ctx, calls } = mockCtx([], { display: eventsDisplay });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "**Connect**");
  assertEquals(calls.length, 0);
});

/** The list is the scope, and no permission change widens it. */
Deno.test("vault-list: says a missing vault means a new token", () => {
  assert(/only a new token will/.test(action.description!), action.description);
});
