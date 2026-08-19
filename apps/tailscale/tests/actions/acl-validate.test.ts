import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/acl-validate.ts";

const tests = '[{"src":"ada@example.com","accept":["tag:prod:22"]}]';
const policy = '{"acls":[{"action":"accept","users":["*"],"ports":["*:*"]}]}';

/** An array runs tests; an object validates a file. Same endpoint. */
Deno.test("acl-validate: posts tests as an array against the live policy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ tests }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tailnet/-/acl/validate");
  assertEquals(calls[0].method, "POST");
  assert(Array.isArray(JSON.parse(calls[0].body!)), "the body must be an array");
  assertEquals(result.mode, "tests");
  assertEquals(result.valid, true);
});

Deno.test("acl-validate: posts a policy file as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ policy }, ctx) as Record<string, unknown>;
  assert(!Array.isArray(JSON.parse(calls[0].body!)), "the body must be an object");
  assertEquals(result.mode, "policy");
});

/** Tailscale chooses its mode from the body's shape. */
Deno.test("acl-validate: an object sent as `tests` is refused, not silently validated", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ tests: policy }, ctx),
    Error,
  );
  assert(/must be an ARRAY/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("acl-validate: refuses both at once, and neither", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ tests, policy }, ctx),
    Error,
    "not both",
  );
  await assertRejects(async () => await action.execute({}, ctx), Error, "supply either");
});

/** A failing test is an answer, not an outage. */
Deno.test("acl-validate: a rejected policy comes back as valid:false rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "invalid policy: unknown tag" } }]);
  const result = await action.execute({ policy }, ctx) as Record<string, unknown>;
  assertEquals(result.valid, false);
  assert(/unknown tag/.test(String(result.message)), String(result.message));
});

/** Tailscale can also answer 200 with the failure in the body. */
Deno.test("acl-validate: errors in a 200 body still mean invalid", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { message: "tests failed", errors: ["ada@example.com cannot reach tag:prod:22"] },
  }]);
  const result = await action.execute({ tests }, ctx) as Record<string, unknown>;
  assertEquals(result.valid, false);
  assertEquals((result.errors as string[]).length, 1);
});

/** This is the reason the app has no policy-writing action. */
Deno.test("acl-validate: says it changes nothing", () => {
  assert(/changing NOTHING/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
