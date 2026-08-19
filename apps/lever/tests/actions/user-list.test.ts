import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const D = { display: { environment: "production" } };
const users = {
  status: 200,
  body: {
    data: [
      { id: "u1", name: "Ada", email: "ada@example.com", accessRole: "super admin" },
      { id: "u2", name: "Grace", email: "grace@example.com", accessRole: "interviewer" },
      { id: "u3", name: "Alan", email: "alan@example.com", accessRole: "admin", deactivatedAt: 1 },
    ],
  },
};

/** This is where every write action's performAs comes from. */
Deno.test("user-list: returns an email-to-id map and excludes leavers", async () => {
  const { ctx, calls } = mockCtx([users], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/users");
  assertEquals(result.count, 2);
  assertEquals((result.byEmail as Record<string, string>)["ada@example.com"], "u1");
  assertEquals(result.deactivatedCount, 1);
});

/** A leaver's id still works as performAs. */
Deno.test("user-list: includes leavers on request and says their ids still work", async () => {
  const { ctx, logs } = mockCtx([users], D);
  const result = await action.execute({ includeDeactivated: true }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assert(
    logs.some((l) => /somebody who no longer works there/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("user-list: counts the access roles and names the admins", async () => {
  const { ctx } = mockCtx([users], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.roles, { "super admin": 1, interviewer: 1 });
  assertEquals(result.admins, ["ada@example.com"]);
});

Deno.test("user-list: an email filter reaches the query", async () => {
  const { ctx, calls } = mockCtx([users], D);
  await action.execute({ email: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("email"), "ada@example.com");
});
