import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/whoami.ts";

const identity = {
  name: "alice",
  type: "user",
  orgs: [{ name: "acme" }, { name: "labs" }],
  auth: { accessToken: { role: "write", fineGrained: { scoped: [] } } },
};

Deno.test("whoami: reads the v2 endpoint and takes no parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: identity }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://huggingface.co/api/whoami-v2");
  assertEquals(calls[0].method, "GET");
  assertEquals(action.params, []);
});

/** A fine-grained token 403s on one repository and works everywhere else. */
Deno.test("whoami: surfaces the role and the fine-grained permissions", async () => {
  const { ctx } = mockCtx([{ status: 200, body: identity }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.name, "alice");
  assertEquals(result.type, "user");
  assertEquals(result.role, "write");
  assert(result.fineGrained, "the newer token kind carries its scopes here");
});

/** `repo-create` needs a namespace, and these are the legal ones. */
Deno.test("whoami: flattens the organisations to names", async () => {
  const { ctx } = mockCtx([{ status: 200, body: identity }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.orgs, ["acme", "labs"]);
});

Deno.test("whoami: a sparse response does not throw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.orgs, []);
  assertEquals(result.role, undefined);
});

Deno.test("whoami: the description names the symptom it explains", () => {
  assert(/intermittent fault/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});
