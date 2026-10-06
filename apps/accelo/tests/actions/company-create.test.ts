import { assertEquals } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/company-create.ts";

Deno.test("company-create: POSTs a form to /companies using Accelo's wire names", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "55" } },
  }]);
  const out = await action.execute({
    "name": "Acme",
    "website": "acme.test",
    "statusId": 3,
    "customId": "C-1",
  }, ctx);
  assertEquals(out, { id: "55" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/companies");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "name": "Acme",
    "website": "acme.test",
    "status_id": "3",
    "custom_id": "C-1",
  });
});

Deno.test("company-create: drops unset fields and forwards _fields", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "56" } },
  }]);
  await action.execute({ name: "Acme", fields: "_ALL", comments: "" }, ctx);
  const sent = Object.fromEntries(new URLSearchParams(calls[0].body ?? ""));
  assertEquals(sent._fields, "_ALL");
  assertEquals("comments" in sent, false);
});

Deno.test("company-create: declares itself non-idempotent and requires name", () => {
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => "required" in p && p.required).map((p) =>
    p.key
  );
  assertEquals(required, ["name"]);
});
