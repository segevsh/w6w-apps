import { assertEquals, assertRejects } from "@std/assert";
import createAction from "../../actions/create-action.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-action: POST /actions with the documented body fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ action: { id: "a1" } }) }]);
  const out = await createAction.execute({
    contactId: "c1",
    text: "Call back",
    status: "date",
    date: "2026-10-09",
    assigneeId: "u1",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/actions");
  assertEquals(bodyOf(calls[0]), {
    contact_id: "c1",
    text: "Call back",
    status: "date",
    date: "2026-10-09",
    assignee_id: "u1",
  });
  assertEquals(out.action, { id: "a1" });
});

Deno.test("create-action: a second ASAP action answers 409 and is reported as such", async () => {
  const { ctx } = mockCtx([{ status: 409, body: errorBody("conflict", "already has one", 409) }]);
  await assertRejects(
    () =>
      Promise.resolve(createAction.execute({ contactId: "c1", text: "t", status: "asap" }, ctx)),
    Error,
    "HTTP 409",
  );
});

Deno.test("create-action: text is capped at 140 characters in the form and is not idempotent", () => {
  const text = createAction.params!.find((p) => p.key === "text")!;
  assertEquals(text.validation?.maxLength, 140);
  assertEquals(createAction.idempotent, false);
});
