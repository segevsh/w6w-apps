import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-create.ts";

Deno.test("form-create: POST /v1/forms with info.title only", async () => {
  const { ctx, calls } = mockCtx([{ body: { formId: "f1" } }]);
  const result = await action.execute({ title: "Feedback" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://forms.googleapis.com");
  assertEquals(url.pathname, "/v1/forms");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { info: { title: "Feedback" } });
  assertEquals(url.searchParams.has("unpublished"), false);
  assertEquals(result, { formId: "f1" });
});

Deno.test("form-create: sends documentTitle and the unpublished query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { formId: "f2" } }]);
  await action.execute({ title: "Q3 survey", documentTitle: "q3.form", unpublished: true }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("unpublished"), "true");
  assertEquals(JSON.parse(calls[0].body!), {
    info: { title: "Q3 survey", documentTitle: "q3.form" },
  });
});

Deno.test("form-create: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
