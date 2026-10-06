import { assertRejects } from "@std/assert";
import extractCreate from "../../actions/extract-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("extract-create: required fields; a 403 names the beta gate", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { code: "FORBIDDEN" } } }]);
  await assertRejects(
    async () => await extractCreate.execute({ q: "", url: "u" }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () => await extractCreate.execute({ q: "q", url: "" }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () => await extractCreate.execute({ q: "q", url: "u" }, ctx),
    Error,
    "beta",
  );
});
