import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-archive.ts";

test("client-archive: calls clientArchive with the client id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientArchive: { client: { id: "c1", isArchived: true }, userErrors: [] } } },
  }]);
  const out = await action.execute({ clientId: "c1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("clientArchive(clientId: $clientId)"));
  assertEquals(sent.variables, { clientId: "c1" });
  assertEquals((out as { client: { isArchived: boolean } }).client.isArchived, true);
});

test("client-archive: never calls clientDelete", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { clientArchive: { client: { id: "c1" }, userErrors: [] } } },
  }]);
  await action.execute({ clientId: "c1" }, ctx);
  assert(!JSON.parse(calls[0].body!).query.includes("clientDelete"));
});

test("client-archive: a refusal to archive open work throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        clientArchive: {
          client: null,
          userErrors: [{ message: "Client has open work and cannot be archived" }],
        },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ clientId: "c1" }, ctx),
    Error,
    "open work",
  );
});
