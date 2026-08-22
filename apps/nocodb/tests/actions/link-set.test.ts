import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/link-set.ts";

const D = { display: { host: "https://nocodb.internal" } };
const ok = { status: 200, body: {} };
const base = { tableId: "mtbl1", linkFieldId: "cl1", recordId: "3" };

Deno.test("link-set: add posts the ids and leaves the rest alone", async () => {
  const { ctx, calls, logs } = mockCtx([ok], D);
  const result = await action.execute({ ...base, linkedIds: "5, 6" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tables/mtbl1/links/cl1/records/3");
  assertEquals(JSON.parse(calls[0].body!), [{ Id: "5" }, { Id: "6" }]);
  assertEquals(result.added, ["5", "6"]);
  assertEquals(result.requests, 1);
  assert(
    logs.some((l) => /cardinality wins, quietly/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("link-set: remove deletes exactly the ids named", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  const result = await action.execute({ ...base, linkedIds: "5", mode: "remove" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.removed, ["5"]);
});

/** NocoDB has no replace, so this is read, remove, add — three requests. */
Deno.test("link-set: replace reconciles, and reports what it cost", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { list: [{ Id: 5 }, { Id: 9 }] } },
    ok,
    ok,
  ], D);
  const result = await action.execute(
    { ...base, linkedIds: "5, 6", mode: "replace" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(JSON.parse(calls[1].body!), [{ Id: "9" }]);
  assertEquals(calls[2].method, "POST");
  assertEquals(JSON.parse(calls[2].body!), [{ Id: "6" }]);
  assertEquals(result.added, ["6"]);
  assertEquals(result.removed, ["9"]);
  assertEquals(result.requests, 3);
});

/** A replace that changes nothing should cost one request, not three. */
Deno.test("link-set: replace with the same set writes nothing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: [{ Id: 5 }] } }], D);
  const result = await action.execute({ ...base, linkedIds: "5", mode: "replace" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(result.changed, false);
  assertEquals(result.requests, 1);
});

Deno.test("link-set: requires the ids and the field", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ ...base, linkedIds: "" }, ctx),
    Error,
    "at least one record",
  );
  await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", recordId: "3", linkedIds: "5" }, ctx),
    Error,
    "`linkFieldId` is required",
  );
  assertEquals(calls.length, 0);
});

/** record-update cannot do this. */
Deno.test("link-set: says links have their own endpoint", () => {
  assert(/`record-update` CANNOT do/.test(action.description!), action.description);
});
