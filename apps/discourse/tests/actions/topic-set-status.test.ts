import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-set-status.ts";

Deno.test("topic-set-status: PUTs /t/{id}/status.json", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { success: "OK" } }]);
  await action.execute({ topicId: 42, status: "closed", enabled: true }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/t/42/status.json`);
  assertEquals(calls[0].method, "PUT");
});

Deno.test("topic-set-status: `enabled` is a QUOTED string, not a JSON boolean", async () => {
  // This endpoint is the API's own stated exception to its boolean rule:
  // `enabled` is typed `string` with enum ["true", "false"]. Sending a JSON
  // boolean here is the mistake this action exists to prevent.
  const on = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, status: "closed", enabled: true }, on.ctx);
  assert(on.calls[0].body!.includes('"enabled":"true"'));
  assertEquals(JSON.parse(on.calls[0].body!).enabled, "true");

  const off = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, status: "visible", enabled: false }, off.ctx);
  assert(off.calls[0].body!.includes('"enabled":"false"'));
  // `false` must survive `compact` — it is the whole point of the call.
  assertEquals(JSON.parse(off.calls[0].body!).enabled, "false");
});

Deno.test("topic-set-status: `until` is sent only when supplied", async () => {
  const withUntil = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { topicId: 1, status: "pinned", enabled: true, until: "2030-12-31" },
    withUntil.ctx,
  );
  assertEquals(JSON.parse(withUntil.calls[0].body!).until, "2030-12-31");

  const without = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, status: "pinned", enabled: true }, without.ctx);
  assertEquals("until" in JSON.parse(without.calls[0].body!), false);
});

Deno.test("topic-set-status: offers exactly the five statuses the endpoint's enum allows", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  const values = (status.options as { value: string }[]).map((o) => o.value);
  assertEquals(values, ["closed", "pinned", "pinned_globally", "archived", "visible"]);
});
