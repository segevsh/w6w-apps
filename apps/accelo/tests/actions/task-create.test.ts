import { assertEquals } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs a form to /tasks using Accelo's wire names", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "55" } },
  }]);
  const out = await action.execute({
    "title": "Draft",
    "againstType": "job",
    "againstId": 4,
    "assigneeId": 5,
    "dateDue": 1490140800,
    "isBillable": true,
  }, ctx);
  assertEquals(out, { id: "55" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tasks");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "title": "Draft",
    "against_type": "job",
    "against_id": "4",
    "assignee_id": "5",
    "date_due": "1490140800",
    "is_billable": "yes",
  });
});

Deno.test("task-create: drops unset fields and forwards _fields", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "56" } },
  }]);
  await action.execute({ title: "Draft", fields: "_ALL", comments: "" }, ctx);
  const sent = Object.fromEntries(new URLSearchParams(calls[0].body ?? ""));
  assertEquals(sent._fields, "_ALL");
  assertEquals("comments" in sent, false);
});

Deno.test("task-create: declares itself non-idempotent and requires title", () => {
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => "required" in p && p.required).map((p) =>
    p.key
  );
  assertEquals(required, ["title"]);
});
