import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-case.ts";

Deno.test("create-case: identity", () => {
  assertEquals(action.key, "create-case");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "support");
  assertEquals(action.idempotent, false);
});

Deno.test("create-case: sends POST /api/v1/support/cases", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    subject: "Help",
    body: "It broke",
    fromEmail: "a@example.com",
    sendAutoResponder: false,
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/support/cases");
  assertEquals(url.searchParams.get("sendautoresponder"), "false");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Subject: "Help",
    Body: "It broke",
    FromPerson: {
      Email: "a@example.com",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("create-case: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      subject: "Help",
      body: "It broke",
      fromEmail: "a@example.com",
      sendAutoResponder: false,
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/support/cases"));
});
