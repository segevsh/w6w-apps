import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listTemplates from "../../actions/list-templates.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1 }], Total: 1 } };

// --------------------------------------------------------------- list-templates

Deno.test("list-templates: GETs /v3/REST/template", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listTemplates.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/template");
});

Deno.test("list-templates: forwards Purposes, OwnerType and EditMode", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listTemplates.execute!(
    { purposes: "transactional", ownerType: "apikey", editMode: 4 },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("Purposes"), "transactional");
  assertEquals(p.get("OwnerType"), "apikey");
  assertEquals(p.get("EditMode"), "4");
});
