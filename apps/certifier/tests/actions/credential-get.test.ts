import { assertEquals, assertRejects } from "@std/assert";
import credentialGet from "../../actions/credential-get.ts";
import { CREDENTIAL, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-get: GET /v1/credentials/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: CREDENTIAL }]);
  const out = await credentialGet.execute({ credentialId: "c1" }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1");
  assertEquals(out.status, "draft");
});

Deno.test("credential-get: the id is path-escaped and a 404 surfaces", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: errorBody("not_found", "no such credential"),
  }]);
  await assertRejects(
    async () => await credentialGet.execute({ credentialId: "a/b" }, ctx),
    Error,
    "404 not_found",
  );
  assertEquals(pathOf(calls[0].url), "/v1/credentials/a%2Fb");
});
