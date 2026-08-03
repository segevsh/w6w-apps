import { assert, assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-update.ts";

Deno.test("form-update: PATCHes only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1", name: "Renamed" } }]);
  const result = await action.execute({ formId: "f1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/forms/f1");
  // `blocks` must NOT be sent when unset — sending it would wipe the form.
  assertEquals(jsonBody(calls[0]), { name: "Renamed" });
  assertEquals(result.name, "Renamed");
});

Deno.test("form-update: warns when it is about to replace the block array", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", blocks: [{ uuid: "b1" }] }, ctx);

  assertEquals(jsonBody(calls[0]), { blocks: [{ uuid: "b1" }] });
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("omitted blocks are deleted"));
});

Deno.test("form-update: stays silent when blocks are untouched", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", status: "DRAFT" }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("form-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
