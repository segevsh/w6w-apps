import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-create.ts";

const D = { display: { host: "https://search.internal:8108" } };
const created = {
  status: 200,
  body: { id: 9, value: "SUPERSECRETKEY", value_prefix: "SUPE" },
};

/** Too narrow fails immediately; too wide fails silently for months. */
Deno.test("key-create: defaults to search-only", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute({ description: "front end", collections: "products" }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.actions, ["documents:search"]);
  assertEquals(body.collections, ["products"]);
  assertEquals("expires_at" in body, false);
});

/** The value is returned once and never again. */
Deno.test("key-create: returns the value and never logs it", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute({ description: "front end" }, ctx) as Record<string, unknown>;
  assertEquals(result.value, "SUPERSECRETKEY");
  assertEquals(result.valuePrefix, "SUPE");
  const logged = JSON.stringify(logs);
  assert(!/SUPERSECRETKEY/.test(logged), logged);
  assert(/"id":9/.test(logged), logged);
});

Deno.test("key-create: warns about an unrestricted key", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute(
    { description: "admin", actions: "*", collections: "*" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isAdmin, true);
  assert(
    logs.some((l) => l.level === "warn" && /not one to ship anywhere/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A duration lands in 1970 and 401s with no mention of expiry. */
Deno.test("key-create: converts days to an absolute timestamp", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute({ description: "temporary", expiresInDays: 7 }, ctx);
  const expiresAt = Number((JSON.parse(calls[0].body!) as { expires_at: number }).expires_at);
  const days = (expiresAt - Date.now() / 1000) / 86_400;
  assert(days > 6.9 && days < 7.1, `expiry is ${days} days away`);
});

Deno.test("key-create: requires a description and a sane expiry", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({}, ctx), Error);
  assert(/only label anyone auditing/.test(err.message), err.message);
  await assertRejects(
    async () => await action.execute({ description: "x", expiresInDays: -1 }, ctx),
    Error,
    "0 or more",
  );
  assertEquals(calls.length, 0);
});

Deno.test("key-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/VALUE IS RETURNED ONCE/.test(action.description!), action.description);
});
