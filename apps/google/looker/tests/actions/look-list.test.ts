import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/look-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const looks = [
  { id: "1", title: "Weekly revenue", public: true },
  { id: "2", title: "Churn", public: false },
  { id: "3", title: "Old revenue", deleted: true },
];

/** Looker soft-deletes and keeps returning them. */
test("look-list: excludes soft-deleted Looks and still counts them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: looks }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/looks");
  assertEquals(result.count, 2);
  assertEquals(result.ids, ["1", "2"]);
  assertEquals(result.deletedCount, 1);
});

test("look-list: includeDeleted returns them", async () => {
  const { ctx } = mockCtx([{ status: 200, body: looks }], D);
  const result = await action.execute({ includeDeleted: true }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
});

/** A public Look serves business data with no login. */
test("look-list: counts public Looks and warns about them", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: looks }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.publicCount, 1);
  assertEquals(result.publicLooks, ["Weekly revenue"]);
  assert(
    logs.some((l) => l.level === "warn" && /anybody with the URL/.test(l.message)),
    JSON.stringify(logs),
  );
});

test("look-list: no warning when nothing is public", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: [looks[1]] }], D);
  await action.execute({}, ctx);
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

/** Title matching happens here, case-insensitively. */
test("look-list: filters on the title without asking Looker to", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: looks }], D);
  const result = await action.execute({ title: "REVENUE" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.ids, ["1"]);
  assertEquals(new URL(calls[0].url).searchParams.get("title"), null);
});

test("look-list: says the visible set depends on the credential's user", () => {
  assert(/different sets/.test(action.description!), action.description);
});
