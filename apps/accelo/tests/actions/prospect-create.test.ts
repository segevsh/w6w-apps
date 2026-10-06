import { assertEquals } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/prospect-create.ts";

Deno.test("prospect-create: POSTs a form to /prospects using Accelo's wire names", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "55" } },
  }]);
  const out = await action.execute({
    "title": "Deal",
    "affiliationId": 1421,
    "typeId": 3,
    "value": 5000,
  }, ctx);
  assertEquals(out, { id: "55" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/prospects");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "title": "Deal",
    "affiliation_id": "1421",
    "type_id": "3",
    "value": "5000",
  });
});

Deno.test("prospect-create: drops unset fields and forwards _fields", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "56" } },
  }]);
  await action.execute({
    title: "Deal",
    affiliationId: 1421,
    typeId: 3,
    fields: "_ALL",
    comments: "",
  }, ctx);
  const sent = Object.fromEntries(new URLSearchParams(calls[0].body ?? ""));
  assertEquals(sent._fields, "_ALL");
  assertEquals("comments" in sent, false);
});

Deno.test("prospect-create: declares itself non-idempotent and requires title, affiliationId, typeId", () => {
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => "required" in p && p.required).map((p) =>
    p.key
  );
  assertEquals(required, ["title", "affiliationId", "typeId"]);
});
