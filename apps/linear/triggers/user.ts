import { webhookTrigger } from "../lib/triggers.ts";

/** A workspace member created or updated (Linear's `User` webhook resource). */
const user = webhookTrigger({
  key: "user",
  title: "User Event",
  description:
    "Fires when a workspace member is created or updated. The run gets the action, the user and, on an update, the values that changed.",
  resourceType: "User",
  output: [
    { key: "data.name", type: "string", label: "Name" },
    { key: "data.email", type: "string", label: "Email" },
    { key: "data.active", type: "boolean", label: "Active" },
  ],
  sampleData: {
    id: "3f1c9a52-7d4e-4b8a-a6c1-5e2d9b0f7a34",
    name: "Sam Sample",
    email: "sam@example.test",
    active: true,
  },
});

export default user;
