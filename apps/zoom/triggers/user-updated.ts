import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "user-updated",
  title: "User Updated",
  description:
    "Fires when a user is updated. The run gets the changed fields of the user and, in oldObject, their previous values.",
  event: "user.updated",
  sampleObject: {
    "id": "sample-user-id",
    "email": "ada@example.com",
    "first_name": "Ada",
    "last_name": "Byron",
  },
});
