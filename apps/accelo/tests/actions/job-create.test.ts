import { assertEquals } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/job-create.ts";

Deno.test("job-create: POSTs a form to /jobs using Accelo's wire names", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "55" } },
  }]);
  const out = await action.execute({
    "title": "Site",
    "typeId": 2,
    "againstType": "company",
    "againstId": 1,
    "managerId": 9,
    "isBillable": false,
  }, ctx);
  assertEquals(out, { id: "55" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/jobs");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "title": "Site",
    "type_id": "2",
    "against_type": "company",
    "against_id": "1",
    "manager_id": "9",
    "is_billable": "no",
  });
});

Deno.test("job-create: drops unset fields and forwards _fields", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "56" } },
  }]);
  await action.execute({ title: "Site", fields: "_ALL", comments: "" }, ctx);
  const sent = Object.fromEntries(new URLSearchParams(calls[0].body ?? ""));
  assertEquals(sent._fields, "_ALL");
  assertEquals("comments" in sent, false);
});

Deno.test("job-create: declares itself non-idempotent and requires title", () => {
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => "required" in p && p.required).map((p) =>
    p.key
  );
  assertEquals(required, ["title"]);
});
