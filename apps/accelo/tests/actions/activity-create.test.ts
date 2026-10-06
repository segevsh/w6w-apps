import { assertEquals } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/activity-create.ts";

Deno.test("activity-create: POSTs a form to /activities using Accelo's wire names", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "55" } },
  }]);
  const out = await action.execute({
    "subject": "Call",
    "againstType": "job",
    "againstId": 14,
    "medium": "call",
    "billable": 3600,
    "dateStarted": 1490140800,
  }, ctx);
  assertEquals(out, { id: "55" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/activities");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "subject": "Call",
    "against_type": "job",
    "against_id": "14",
    "medium": "call",
    "billable": "3600",
    "date_started": "1490140800",
  });
});

Deno.test("activity-create: drops unset fields and forwards _fields", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "56" } },
  }]);
  await action.execute({
    subject: "Call",
    againstType: "job",
    againstId: 14,
    fields: "_ALL",
    comments: "",
  }, ctx);
  const sent = Object.fromEntries(new URLSearchParams(calls[0].body ?? ""));
  assertEquals(sent._fields, "_ALL");
  assertEquals("comments" in sent, false);
});

Deno.test("activity-create: declares itself non-idempotent and requires subject, againstType, againstId", () => {
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => "required" in p && p.required).map((p) =>
    p.key
  );
  assertEquals(required, ["subject", "againstType", "againstId"]);
});
