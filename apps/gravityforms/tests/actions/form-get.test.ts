import { assert, assertEquals, assertRejects } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GETs /forms/{id} and returns the form verbatim", async () => {
  const form = { id: "30", title: "Contact", fields: [{ id: 1 }] };
  const { ctx, calls } = mockCtx([{ body: form }], { display: DISPLAY });
  const out = await action.execute!({ formId: 30 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30`);
  assertEquals(out, form);
});

Deno.test("form-get: percent-encodes the form ID into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/a%20b`);
});

Deno.test("form-get: propagates a 404 as a descriptive error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "gf_form_not_found", message: "No form" },
  }], {
    display: DISPLAY,
  });
  await assertRejects(
    async () => await action.execute!({ formId: 99 }, ctx),
    Error,
    "gf_form_not_found",
  );
});

Deno.test("form-get: fails when the connection carries no site URL", async () => {
  const { ctx } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ formId: 1 }, ctx),
    Error,
    "missing siteUrl",
  );
});

Deno.test("form-get: is a read action against the form resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "form");
  assert(action.params?.find((p) => p.key === "formId")?.required);
});
