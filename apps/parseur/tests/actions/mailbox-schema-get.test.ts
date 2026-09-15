import { assertEquals } from "@std/assert";
import mailboxSchemaGet from "../../actions/mailbox-schema-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-schema-get: GETs /parser/{id}/schema", async () => {
  const { ctx, calls } = mockCtx([
    { body: { type: "object", properties: { CustomerName: { type: "string" } } } },
  ]);
  const out = await mailboxSchemaGet.execute({ mailboxId: "9" }, ctx) as {
    properties: Record<string, unknown>;
  };

  assertEquals(pathOf(calls[0].url), "/parser/9/schema");
  assertEquals(Object.keys(out.properties), ["CustomerName"]);
});
