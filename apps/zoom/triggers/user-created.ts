import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "user-created",
  title: "User Created",
  description: "Fires when a user is added to the account. The run gets the user.",
  event: "user.created",
  sampleObject: {
    "id": "sample-user-id",
    "email": "ada@example.com",
    "first_name": "Ada",
    "last_name": "Lovelace",
    "type": 1,
  },
});
