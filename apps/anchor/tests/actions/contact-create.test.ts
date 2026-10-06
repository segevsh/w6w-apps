import { assert, assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-create: sends POST /contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: '"c_new"' }]);
  const out = await contactCreate.execute(
    {
      "firstName": "A",
      "lastName": "B",
      "email": "a@b.co",
      "companyName": "Co",
      "metadata": '{"k":"v"}',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/contacts");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "firstName": "A",
    "lastName": "B",
    "email": "a@b.co",
    "companyName": "Co",
    "metadata": { "k": "v" },
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.contactId, "c_new");
});

Deno.test("contact-create: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await contactCreate.execute(
      {
        "firstName": "A",
        "lastName": "B",
        "email": "a@b.co",
        "companyName": "Co",
        "metadata": '{"k":"v"}',
      } as never,
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});

Deno.test("contact-create: invalid metadata JSON is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let failed = false;
  try {
    await contactCreate.execute(
      {
        firstName: "A",
        lastName: "B",
        email: "a@b.co",
        companyName: "C",
        metadata: "{nope",
      } as never,
      ctx,
    );
  } catch {
    failed = true;
  }
  assert(failed);
  assertEquals(calls.length, 0);
});
