import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-note-create.ts";

Deno.test("incident-note-create: posts the note content with the From header", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { note: { id: "N1", content: "checking now" } },
  }]);
  const result = await action.execute!(
    { incidentId: "P1", content: "checking now", from: "user@example.com" },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P1/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["from"], "user@example.com");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { note: { content: "checking now" } });
  assertEquals(result, { note: { id: "N1", content: "checking now" } });
});

Deno.test("incident-note-create: missing incidentId, content, or from rejects", async () => {
  const base = { incidentId: "P1", content: "note", from: "user@example.com" };
  for (const patch of [{ incidentId: "" }, { content: "" }, { from: "" }]) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!({ ...base, ...patch }, ctx),
      Error,
    );
  }
});
