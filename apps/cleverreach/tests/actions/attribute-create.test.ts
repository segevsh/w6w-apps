import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/attribute-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("attribute-create: POSTs the attribute", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "secret_id" } }]);
  await action.execute({
    name: "secret_id",
    type: "text",
    groupId: "1939",
    description: "Secret identity",
    previewValue: "real name",
    defaultValue: "Bruce Wayne",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/attributes");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "secret_id",
    type: "text",
    group_id: "1939",
    description: "Secret identity",
    preview_value: "real name",
    default_value: "Bruce Wayne",
  });
});

Deno.test("attribute-create: requires a name and a documented type", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ type: "text" }, ctx),
    Error,
    "`name` is required",
  );
  await assertRejects(
    async () => await action.execute({ name: "x" }, ctx),
    Error,
    "`type` is required",
  );
  await assertRejects(
    async () => await action.execute({ name: "x", type: "boolean" }, ctx),
    Error,
    "`type` must be one of",
  );
  assertEquals(calls.length, 0);
});
