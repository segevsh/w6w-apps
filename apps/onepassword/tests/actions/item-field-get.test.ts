import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ITEM, ok } from "./_shared.ts";
import action from "../../actions/item-field-get.ts";

/** One value, and nothing else enters the run's data. */
Deno.test("item-field-get: returns exactly one field", async () => {
  const { ctx } = mockCtx([ok(ITEM)], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    field: "password",
  }, ctx) as { value: string; label: string; isSecret: boolean };
  assertEquals(result.value, "hunter2");
  assertEquals(result.label, "password");
  assertEquals(result.isSecret, true);
  assertEquals(Object.keys(result).sort(), ["isSecret", "label", "type", "value"]);
});

/** `purpose` survives a renamed or localised label. */
Deno.test("item-field-get: `password` matches on purpose, not on the label", async () => {
  const { ctx } = mockCtx([
    ok({
      fields: [
        { id: "f1", label: "Mot de passe", type: "CONCEALED", purpose: "PASSWORD", value: "x" },
      ],
    }),
  ], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    field: "password",
  }, ctx) as { value: string };
  assertEquals(result.value, "x");
});

Deno.test("item-field-get: a label or an id both work", async () => {
  const byLabel = mockCtx([ok(ITEM)], { display });
  const label = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    field: "username",
  }, byLabel.ctx) as { value: string };
  assertEquals(label.value, "app");

  const byId = mockCtx([ok(ITEM)], { display });
  const id = await action.execute!({ vaultId: "v1", itemId: "i1", field: "f1" }, byId.ctx) as {
    value: string;
  };
  assertEquals(id.value, "app");
});

/** Picking one silently is how the wrong credential gets used. */
Deno.test("item-field-get: duplicate labels are refused rather than guessed", async () => {
  const { ctx } = mockCtx([
    ok({
      fields: [
        { id: "f1", label: "token", type: "CONCEALED", value: "a" },
        { id: "f2", label: "token", type: "CONCEALED", value: "b" },
      ],
    }),
  ], { display });
  const error = await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", field: "token" }, ctx),
    Error,
  );
  assert(/2 fields on this item match/.test(error.message), error.message);
  assert(/Use the field's id/.test(error.message), error.message);
});

Deno.test("item-field-get: an unknown field lists what is available", async () => {
  const { ctx } = mockCtx([ok(ITEM)], { display });
  const error = await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", field: "apiKey" }, ctx),
    Error,
  );
  assert(/It has: username, password/.test(error.message), error.message);
});

/** The value never reaches a log, and neither does the item's title. */
Deno.test("item-field-get: logs the label and whether it was secret, nothing else", async () => {
  const { ctx, logs } = mockCtx([ok(ITEM)], { display });
  await action.execute!({ vaultId: "v1", itemId: "i1", field: "password" }, ctx);
  const dumped = JSON.stringify(logs);
  assert(!dumped.includes("hunter2"), dumped);
  assert(!dumped.includes("Production database"), dumped);
  assertEquals(logs[0].data, { label: "password", isSecret: true });
});

Deno.test("item-field-get: an Events connection is refused", async () => {
  const { ctx, calls } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", field: "password" }, ctx),
    Error,
    "needs a **Connect** connection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-field-get: says why it exists alongside item-get", () => {
  assert(/never enters the run's data/.test(action.description!), action.description);
});
