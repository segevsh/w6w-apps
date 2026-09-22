import { assertEquals } from "@std/assert";
import formCreate from "../../actions/form-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-create: POSTs title and lists to /forms and returns the public URL", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: 4, title: "Subscribe", url: "https://sendfox.com/f/abc" } },
  ]);
  const out = await formCreate.execute({ title: "Subscribe", lists: [1, 2] }, ctx) as {
    url: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/forms");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { title: "Subscribe", lists: [1, 2] });
  assertEquals(out.url, "https://sendfox.com/f/abc");
});

Deno.test("form-create: redirect URL and the GDPR toggle are mapped when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 4 } }]);
  await formCreate.execute(
    {
      title: "Subscribe",
      lists: [1],
      redirectUrl: "https://example.com/thanks",
      gdprRequired: true,
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    title: "Subscribe",
    lists: [1],
    redirect_url: "https://example.com/thanks",
    gdpr_required: true,
  });
});

Deno.test("form-create: title and lists are the two required fields", () => {
  const requiredKeys = (formCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(requiredKeys, ["title", "lists"]);
});

Deno.test("form-create: is not marked idempotent", () => {
  assertEquals(formCreate.idempotent, false);
});
