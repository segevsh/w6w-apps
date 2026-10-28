import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-user.ts";

const base = {
  displayName: "Adele Vance",
  userPrincipalName: "adele@contoso.com",
  mailNickname: "adele",
  password: "xWwvJ]6NMw+bWH-d",
};

Deno.test("create-user: POSTs /users with the five documented required properties", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "u1" } }]);
  const out = await action.execute(base, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    accountEnabled: true,
    displayName: "Adele Vance",
    mailNickname: "adele",
    userPrincipalName: "adele@contoso.com",
    passwordProfile: { forceChangePasswordNextSignIn: true, password: base.password },
  });
  assertEquals(out.id, "u1");
});

Deno.test("create-user: optional fields and additionalProperties are merged in", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    ...base,
    forceChangePasswordNextSignIn: false,
    accountEnabled: false,
    jobTitle: "Engineer",
    usageLocation: "US",
    additionalProperties: '{"employeeType":"Contractor"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.accountEnabled, false);
  assertEquals(body.jobTitle, "Engineer");
  assertEquals(body.usageLocation, "US");
  assertEquals(body.employeeType, "Contractor");
  assertEquals(body.passwordProfile.forceChangePasswordNextSignIn, false);
});

Deno.test("create-user: refuses a missing required field without calling Graph", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ ...base, mailNickname: " " }, ctx),
    Error,
    "mailNickname is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-user: never logs the password", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute(base, ctx);
  assert(!JSON.stringify(logs).includes(base.password));
});

Deno.test("create-user: password is a secret param and the action is not idempotent", () => {
  assertEquals(action.params!.find((p) => p.key === "password")!.type, "secret");
  assertEquals(action.idempotent, false);
});
