import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rfi-create.ts";

Deno.test("rfi-create: POSTs { rfi } with the question wrapped as { body }", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 10, subject: "Slab" } }]);
  const out = await action.execute!({
    companyId: 5,
    projectId: 8,
    subject: "Slab",
    question: "Which rebar?",
    rfiManagerId: 3,
    assigneeIds: [4, 6],
    dueDate: "2026-11-01",
    draft: true,
    isPrivate: false,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1.0/projects/8/rfis");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    rfi: {
      subject: "Slab",
      question: { body: "Which rebar?" },
      rfi_manager_id: 3,
      assignee_ids: [4, 6],
      due_date: "2026-11-01",
      draft: true,
      private: false,
    },
  });
  assertEquals(out, { id: 10, subject: "Slab" });
});

Deno.test("rfi-create: sends only the required fields when the rest are blank", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 10 } }]);
  await action.execute!({
    projectId: 8,
    subject: "S",
    question: "Q",
    rfiManagerId: 3,
    assigneeIds: [],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    rfi: { subject: "S", question: { body: "Q" }, rfi_manager_id: 3 },
  });
});

Deno.test("rfi-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
