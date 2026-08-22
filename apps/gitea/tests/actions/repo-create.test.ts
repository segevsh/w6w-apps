import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-create.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** Two endpoints, and posting to the wrong one puts the repo in the wrong place. */
Deno.test("repo-create: the organization chooses the endpoint", async () => {
  const personal = mockCtx([{ status: 201, body: { full_name: "ada/web" } }], conn);
  await action.execute!({ name: "web" }, personal.ctx);
  assertEquals(personal.calls[0].url, "https://git.example.com/api/v1/user/repos");

  const org = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ name: "web", org: "acme" }, org.ctx);
  assertEquals(org.calls[0].url, "https://git.example.com/api/v1/orgs/acme/repos");
});

/** Without an initial commit there is no default branch to write to. */
Deno.test("repo-create: initialises with a commit by default, and is private by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ name: "web" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.auto_init, true);
  assertEquals(body.private, true);
});

Deno.test("repo-create: both flags can be turned off explicitly", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ name: "web", autoInit: false, private: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.auto_init, false);
  assertEquals(body.private, false);
});

Deno.test("repo-create: a name is required, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "autoInit")!;
  assert(param.hint!.includes("no default branch"), param.hint);
});
