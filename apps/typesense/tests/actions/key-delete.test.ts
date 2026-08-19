import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-delete.ts";

const D = { display: { host: "https://search.internal:8108" } };
const key = {
  status: 200,
  body: {
    id: 2,
    description: "front end",
    actions: ["documents:search"],
    collections: ["products"],
  },
};
const ok = { status: 200, body: { id: 2 } };

Deno.test("key-delete: revokes by numeric id", async () => {
  const { ctx, calls } = mockCtx([key, ok], D);
  const result = await action.execute({ keyId: 2 }, ctx) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/keys/2");
  assertEquals(result.description, "front end");
  assertEquals(result.revoked, true);
  assertEquals(result.wasUnrestricted, false);
});

/** Immediate, with no grace period. */
Deno.test("key-delete: warns that revocation is instant", async () => {
  const { ctx, logs } = mockCtx([key, ok], D);
  await action.execute({ keyId: 2 }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /no grace period/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("key-delete: reports when the revoked key was unrestricted", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { id: 1, actions: ["*"], collections: ["*"] } },
    ok,
  ], D);
  const result = await action.execute({ keyId: 1 }, ctx) as Record<string, unknown>;
  assertEquals(result.wasUnrestricted, true);
});

Deno.test("key-delete: requires a numeric id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ keyId: 0 }, ctx), Error, "numeric id");
  await assertRejects(async () => await action.execute({}, ctx), Error, "numeric id");
  assertEquals(calls.length, 0);
});

/** The server's --api-key is configuration, not a record. */
Deno.test("key-delete: says the bootstrap key cannot be revoked here", () => {
  assert(/cannot be revoked here at all/.test(action.description!), action.description);
});
