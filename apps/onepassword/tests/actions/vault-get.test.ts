import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/vault-get.ts";

Deno.test("vault-get: reads one vault's metadata", async () => {
  const { ctx, calls } = mockCtx([
    ok({ id: "v1", name: "Prod", items: 12, contentVersion: 42 }),
  ], { display });
  const result = await action.execute!({ vaultId: "v1" }, ctx) as {
    items: number;
    contentVersion: number;
  };
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults/v1");
  assertEquals(result.items, 12);
  assertEquals(result.contentVersion, 42);
});

Deno.test("vault-get: needs a vault", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`vaultId` is required");
  assertEquals(calls.length, 0);
});

Deno.test("vault-get: an Events connection is refused", async () => {
  const { ctx } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1" }, ctx),
    Error,
    "**Connect**",
  );
});

/** contentVersion is a cheap change poll. */
Deno.test("vault-get: says what contentVersion is good for", () => {
  assert(/poll for changes/.test(action.description!), action.description);
});
