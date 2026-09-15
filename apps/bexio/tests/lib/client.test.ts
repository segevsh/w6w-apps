import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BexioApiError, BexioClient, listQuery } from "../../lib/client.ts";

Deno.test("BexioClient: every request carries Accept: application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new BexioClient(ctx).list("/2.0/contact");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("BexioClient: a non-2xx response is thrown as a BexioApiError carrying the vendor body", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { error_code: 404, message: "Page not found" } },
  ]);
  const err = await assertRejects(
    () => new BexioClient(ctx).get("/2.0/contact/999999"),
    BexioApiError,
  );
  assertEquals((err as BexioApiError).status, 404);
  assertEquals((err as BexioApiError).body?.message, "Page not found");
  assertEquals((err as BexioApiError).message.includes("Page not found"), true);
});

Deno.test("BexioClient.post: compacts undefined/null/empty-string fields before sending", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await new BexioClient(ctx).post("/2.0/contact", {
    name_1: "Acme",
    name_2: undefined,
    mail: null,
    remarks: "",
  });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name_1: "Acme" });
});

Deno.test("listQuery: appends _desc only when descending", () => {
  assertEquals(listQuery({ orderBy: "id" }), { order_by: "id" });
  assertEquals(listQuery({ orderBy: "id", descending: true }), { order_by: "id_desc" });
  assertEquals(listQuery({ limit: 10, offset: 5 }), { limit: 10, offset: 5 });
  assertEquals(listQuery({}), {});
});
