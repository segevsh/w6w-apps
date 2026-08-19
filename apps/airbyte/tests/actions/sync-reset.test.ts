import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sync-reset.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const connection = {
  status: 200,
  body: { name: "Postgres to Snowflake", configurations: { streams: [{}, {}, {}] } },
};
const started = { status: 200, body: { jobId: 99, status: "pending" } };

/** One word apart from a sync, in the same request. */
Deno.test("sync-reset: posts jobType reset", async () => {
  const { ctx, calls } = mockCtx([connection, started], D);
  const result = await action.execute({ connectionId: UUID, confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[1].body!), { connectionId: UUID, jobType: "reset" });
  assertEquals(result.jobId, 99);
  assertEquals(result.streamCount, 3);
  assertEquals(result.connectionName, "Postgres to Snowflake");
});

/** The destination's data is deleted and the source is re-read in full. */
Deno.test("sync-reset: refuses without confirmation, before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ connectionId: UUID }, ctx),
    Error,
  );
  assert(/DELETES the data/.test(err.message), err.message);
  assert(/lands on the source rather than on Airbyte/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("sync-reset: warns about what is being cleared", async () => {
  const { ctx, logs } = mockCtx([connection, started], D);
  await action.execute({ connectionId: UUID, confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /re-read the source in full/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("sync-reset: is not idempotent and is marked destructive", () => {
  assertEquals(action.idempotent, false);
  assert(/DESTRUCTIVE/.test(action.description!), action.description);
});
