import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-abandon.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const detail = (status: string) => ({
  status: 200,
  body: PREFIX + JSON.stringify({ status, subject: "Old work", owner: { name: "Ada" } }),
});
const done = (status: string) => ({ status: 200, body: PREFIX + JSON.stringify({ status }) });

Deno.test("change-abandon: abandons with a message", async () => {
  const { ctx, calls } = mockCtx([detail("NEW"), done("ABANDONED")], D);
  const result = await action.execute(
    { changeId: "620421", message: "Superseded by 620500" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/a/changes/620421/abandon");
  assertEquals(JSON.parse(calls[1].body!).message, "Superseded by 620500");
  assertEquals(result.status, "ABANDONED");
  assertEquals(result.owner, "Ada");
});

Deno.test("change-abandon: restoring hits the other endpoint", async () => {
  const { ctx, calls } = mockCtx([detail("ABANDONED"), done("NEW")], D);
  const result = await action.execute(
    { changeId: "620421", abandon: false, message: "Back on" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/a/changes/620421/restore");
  assertEquals(result.changed, true);
});

/** Gerrit notifies the author, so an unexplained abandon is poor automation. */
Deno.test("change-abandon: requires a message", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ changeId: "620421" }, ctx),
    Error,
  );
  assert(/somebody's work was closed/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("change-abandon: abandoning an abandoned change writes nothing", async () => {
  const { ctx, calls } = mockCtx([detail("ABANDONED")], D);
  const result = await action.execute({ changeId: "620421", message: "x" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.changed, false);
  assertEquals(calls.length, 1);
});

/** A merged change cannot be abandoned. */
Deno.test("change-abandon: refuses a merged change and names the remedy", async () => {
  const { ctx } = mockCtx([detail("MERGED")], D);
  const err = await assertRejects(
    async () => await action.execute({ changeId: "620421", message: "x" }, ctx),
    Error,
  );
  assert(/landing a revert/.test(err.message), err.message);
});

Deno.test("change-abandon: says it is reversible, unlike deletion", () => {
  assert(/REVERSIBLE/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
