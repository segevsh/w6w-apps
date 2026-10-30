import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-update.ts";

const conn = { display: { pageId: "pg1" } };
const ok = { status: 200, body: { id: "inc1", status: "monitoring" } };

test("incident-update: PATCHes the incident with a body", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ incidentId: "inc1", status: "monitoring", body: "A fix is out." }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/incidents/inc1");
  const sent = JSON.parse(calls[0].body!).incident;
  assertEquals(sent.status, "monitoring");
  assertEquals(sent.body, "A fix is out.");
});

/** A status change with no body posts nothing to the timeline. */
test("incident-update: a silent status change is warned about", async () => {
  const { ctx, logs } = mockCtx([ok], conn);
  await action.execute!({ incidentId: "inc1", status: "identified" }, ctx);
  assert(logs.some((l) => l.level === "warn" && /timeline/.test(l.message)), JSON.stringify(logs));
});

test("incident-update: an empty update is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ incidentId: "inc1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** Per-update notification is what makes publish-quietly-then-notify work. */
test("incident-update: the notify hint explains it is per update", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "deliverNotifications")!;
  assert(/[Pp]er UPDATE/.test(p.hint!), p.hint);
});
