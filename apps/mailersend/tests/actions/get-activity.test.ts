import action from "../../actions/get-activity.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-activity", action, "activityId", "/v1/activities/{id}");
