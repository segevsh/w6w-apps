import { assertEquals, assertRejects } from "@std/assert";
import eventRegister from "../../actions/event-register.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("event-register: PUT /event/register with the documented body keys", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { hash: "h", join_link: "https://event.demio.com/join/x" },
  }]);
  const out = await eventRegister.execute({
    eventId: 1,
    dateId: 35,
    name: "John",
    email: "j@x.com",
    lastName: "Doe",
    phoneNumber: "+1",
    customFields: { job_title: "CTO" },
  }, ctx);
  assertEquals(out, { hash: "h", join_link: "https://event.demio.com/join/x" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/event/register`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    job_title: "CTO",
    id: 1,
    date_id: 35,
    name: "John",
    email: "j@x.com",
    last_name: "Doe",
    phone_number: "+1",
  });
});

Deno.test("event-register: a registration URL replaces the event id; a custom key cannot shadow email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { join_link: "u" } }]);
  await eventRegister.execute({
    refUrl: "http://my.demio.com/ref/abc",
    name: "Jo",
    email: "real@x.com",
    customFields: { email: "evil@x.com" },
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email, "real@x.com");
  assertEquals(sent.ref_url, "http://my.demio.com/ref/abc");
  assertEquals("id" in sent, false);
});

Deno.test("event-register: needs an event id or URL, and makes no request without one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await eventRegister.execute({ name: "Jo", email: "a@b.c" }, ctx),
    Error,
    "Event ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-register: a 400 surfaces every validation message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { messages: ["Name must be more than 2 symbols", "Wrong Email format"] },
  }]);
  await assertRejects(
    async () => await eventRegister.execute({ eventId: 1, name: "Jo", email: "bad" }, ctx),
    Error,
    "Wrong Email format",
  );
});
