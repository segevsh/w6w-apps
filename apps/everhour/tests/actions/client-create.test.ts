import { assertEquals, assertRejects } from "@std/assert";
import clientCreate from "../../actions/client-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-create: POST /clients with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await clientCreate.execute({
    "name": "Acme",
    "projects": "ev:1,ev:2",
    "businessDetails": "1 Main St",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/clients");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Acme",
    "projects": ["ev:1", "ev:2"],
    "businessDetails": "1 Main St",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("client-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        clientCreate.execute({
          "name": "Acme",
          "projects": "ev:1,ev:2",
          "businessDetails": "1 Main St",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("client-create: declares perform and idempotent=false", () => {
  assertEquals(clientCreate.type, "perform");
  assertEquals(clientCreate.idempotent, false);
});
