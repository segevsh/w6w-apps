import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-person.ts";

Deno.test("create-person: identity", () => {
  assertEquals(action.key, "create-person");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "person");
  assertEquals(action.idempotent, false);
});

Deno.test("create-person: sends POST /api/v1/crm/people", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    email: "a@example.com",
    firstName: "Ann",
    properties: {
      Custom1: "x",
    },
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/crm/people");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Email: "a@example.com",
    FirstName: "Ann",
    Custom1: "x",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("create-person: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      email: "a@example.com",
      firstName: "Ann",
      properties: {
        Custom1: "x",
      },
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/crm/people"));
});
