import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-update: POSTs only the filled fields to /candidates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "n@x.co" } }]);
  await action.execute({ candidateId: "55", email: "n@x.co", position: "CTO" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/55");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data"));
  const body = calls[0].body!;
  assert(body.includes('name="email"\r\n\r\nn@x.co\r\n'));
  assert(body.includes('name="position"\r\n\r\nCTO\r\n'));
  assert(!body.includes("first_name"));
  assert(!body.includes("candidateId") && !body.includes("55\r\n"), "the id is a path part");
});

Deno.test("candidate-update: needs an id and at least one change", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ email: "a@b.co" }, ctx)), Error, "id");
  await assertRejects(
    async () => await (action.execute({ candidateId: "5" }, ctx)),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
