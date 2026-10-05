import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/member-create.ts";

const INPUT = {
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "role": "moderator",
  "memberType": "limited",
  "spaceIds": "3,4",
  "sendWelcomeEmail": false,
};

Deno.test("member-create: POST /members on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/members`);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  const body = bodyOf(calls[0]);
  assertEquals(body, {
    "email": "ada@example.com",
    "first_name": "Ada",
    "last_name": "Lovelace",
    "role": "moderator",
    "member_type": "limited",
    "space_ids": [3, 4],
    "send_welcome_email": false,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("member-create: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("member-create: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(
    { "email": "ada@example.com", "firstName": "Ada", "lastName": "Lovelace" } as never,
    ctx,
  );
  assertEquals(bodyOf(calls[0]), {
    "email": "ada@example.com",
    "first_name": "Ada",
    "last_name": "Lovelace",
  });
});

Deno.test("member-create: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "email",
    "firstName",
    "lastName",
  ]);
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("member-create: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("member-create: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
