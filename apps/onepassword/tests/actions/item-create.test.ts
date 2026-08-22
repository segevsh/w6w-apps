import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/item-create.ts";

const created = ok({ id: "i9", title: "Rotated key" });

/** A value stored as STRING is visible in the UI and is not audited. */
Deno.test("item-create: fields default to CONCEALED", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    vaultId: "v1",
    title: "Rotated key",
    fields: '[{"label":"credential","value":"secret"}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields[0].type, "CONCEALED");
  assertEquals(body.vault, { id: "v1" });
  assertEquals(body.category, "LOGIN");
});

Deno.test("item-create: an explicit type is respected", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({
    vaultId: "v1",
    title: "Login",
    fields: '[{"label":"username","value":"app","type":"STRING"},{"label":"password","value":"x"}]',
  }, ctx) as { fieldCount: number; concealedCount: number };
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields[0].type, "STRING");
  assertEquals(body.fields[1].type, "CONCEALED");
  assertEquals(result.fieldCount, 2);
  assertEquals(result.concealedCount, 1);
});

Deno.test("item-create: the category is upper-cased and tags are split", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    vaultId: "v1",
    title: "Key",
    category: "api_credential",
    fields: '[{"label":"credential","value":"x"}]',
    tags: "automation, rotated",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.category, "API_CREDENTIAL");
  assertEquals(body.tags, ["automation", "rotated"]);
});

Deno.test("item-create: a field with no label or id is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        vaultId: "v1",
        title: "Key",
        fields: '[{"value":"x"}]',
      }, ctx),
    Error,
    "neither a `label` nor an `id`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-create: needs a vault, a title and fields", async () => {
  for (
    const input of [
      { title: "a", fields: '[{"label":"b","value":"c"}]' },
      { vaultId: "v1", fields: '[{"label":"b","value":"c"}]' },
      { vaultId: "v1", title: "a", fields: "[]" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(input, ctx), Error);
    assertEquals(calls.length, 0);
  }
});

/** Neither the title nor any value reaches a log. */
Deno.test("item-create: logs counts only", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({
    vaultId: "v1",
    title: "Production database",
    fields: '[{"label":"password","value":"hunter2"}]',
  }, ctx);
  const dumped = JSON.stringify(logs);
  assert(!dumped.includes("hunter2"), dumped);
  assert(!dumped.includes("Production"), dumped);
  assertEquals(logs[0].data, { fieldCount: 1, concealedCount: 1 });
});

Deno.test("item-create: an Events connection is refused", async () => {
  const { ctx } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () =>
      await action.execute!(
        { vaultId: "v1", title: "a", fields: '[{"label":"b","value":"c"}]' },
        ctx,
      ),
    Error,
    "**Connect**",
  );
});

Deno.test("item-create: is non-idempotent and says the type is what makes a value secret", () => {
  assertEquals(action.idempotent, false);
  assert(/`CONCEALED` is hidden and audited/.test(action.description!), action.description);
});
