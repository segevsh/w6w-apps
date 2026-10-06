import type { ActionDefinition } from "@w6w/types";
import { compact, RefinerClient } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  event: string;
}

const eventTrack: ActionDefinition<Input> = {
  key: "event-track",
  type: "perform",
  resource: "event",
  title: "Track Event",
  description:
    "Record a named event for a user, which Refiner can use to trigger surveys. A user that " +
    "does not exist yet is created.",
  idempotent: false,
  params: [
    { key: "id", label: "User ID", type: "string", hint: "Required unless an email is given." },
    { key: "email", label: "Email", type: "string", hint: "Alternative to the user id." },
    { key: "event", label: "Event name", type: "string", required: true },
  ],
  output: [{ key: "message", type: "string", label: "`ok` on success" }],

  async execute(input, ctx) {
    const id = input.id?.trim();
    const email = input.email?.trim();
    if (!id && !email) throw new Error("provide a user id or an email");
    return await new RefinerClient(ctx).json("/track-event", {
      method: "POST",
      body: { ...compact({ id, email }), event: input.event },
    });
  },
};

export default eventTrack;
