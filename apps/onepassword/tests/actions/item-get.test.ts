import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ITEM, ok } from "./_shared.ts";
import action from "../../actions/item-get.ts";

/** The default is the structure, not the values. */
Deno.test("item-get: redacts secret values by default and keeps the shape", async () => {
  const { ctx, calls } = mockCtx([ok(ITEM)], { display });
  const result = await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx) as {
    item: { fields: Array<{ label: string; value?: string }> };
    redacted: boolean;
    fieldLabels: string[];
    secretFieldCount: number;
  };
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults/v1/items/i1");
  assertEquals(result.redacted, true);
  assertEquals(result.fieldLabels, ["username", "password"]);
  assertEquals(result.secretFieldCount, 1);
  assertEquals(result.item.fields[0].value, "app", "a non-secret field is untouched");
  assertEquals(result.item.fields[1].value, "[redacted]");
  assert(!JSON.stringify(result).includes("hunter2"), "the secret escaped");
});

Deno.test("item-get: revealSecrets returns everything, and logs a warning", async () => {
  const { ctx, logs } = mockCtx([ok(ITEM)], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    revealSecrets: true,
  }, ctx) as { item: { fields: Array<{ value?: string }> }; redacted: boolean };
  assertEquals(result.redacted, false);
  assertEquals(result.item.fields[1].value, "hunter2");
  assertEquals(logs[0].level, "warn");
});

/** Even when revealing, the log carries no value and no title. */
Deno.test("item-get: never logs a value or the item's title", async () => {
  const { ctx, logs } = mockCtx([ok(ITEM)], { display });
  await action.execute!({ vaultId: "v1", itemId: "i1", revealSecrets: true }, ctx);
  const dumped = JSON.stringify(logs);
  assert(!dumped.includes("hunter2"), dumped);
  assert(!dumped.includes("Production database"), dumped);
  assertEquals(logs[0].data, { secretFieldCount: 1, category: "DATABASE" });
});

/** A password can be typed STRING and still be the password. */
Deno.test("item-get: a PASSWORD purpose is redacted whatever the declared type", async () => {
  const { ctx } = mockCtx([
    ok({
      fields: [{ id: "f1", label: "pw", type: "STRING", purpose: "PASSWORD", value: "secret" }],
    }),
  ], { display });
  const result = await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx) as {
    item: { fields: Array<{ value?: string }> };
  };
  assertEquals(result.item.fields[0].value, "[redacted]");
});

/** The surfaces are separate credentials reaching separate services. */
Deno.test("item-get: an Events connection is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx),
    Error,
    "needs a **Connect** connection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-get: needs a vault and an item", async () => {
  const noVault = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ itemId: "i1" }, noVault.ctx),
    Error,
    "`vaultId` is required",
  );
  const noItem = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1" }, noItem.ctx),
    Error,
    "`itemId` is required",
  );
});

Deno.test("item-get: says the default withholds values", () => {
  assert(/REDACTED by default/.test(action.description!), action.description);
});
