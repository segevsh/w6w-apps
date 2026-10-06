import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-activity",
  resource: "activity",
  title: "Get Activity",
  description:
    "Read one activity event with its email and recipient (GET /v1/activities/{id}). Note the plural `activities` in the path, where the list is `activity`.",
  path: (id) => `/activities/${seg(id)}`,
  idKey: "activityId",
  idLabel: "Activity ID",
  idHint: "The `id` from List Activities.",
});
