import { assertEquals, assertRejects } from "@std/assert";
import clientUpdate from "../../actions/client-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-update: PUT /clients/{clientId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await clientUpdate.execute({
    "clientId": 107,
    "name": "Acme 2",
    "projects": ["ev:1"],
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/clients/107");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Acme 2",
    "projects": ["ev:1"],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("client-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        clientUpdate.execute({ "clientId": 107, "name": "Acme 2", "projects": ["ev:1"] }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("client-update: declares perform and idempotent=true", () => {
  assertEquals(clientUpdate.type, "perform");
  assertEquals(clientUpdate.idempotent, true);
});
