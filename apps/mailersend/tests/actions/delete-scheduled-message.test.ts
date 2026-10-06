import action from "../../actions/delete-scheduled-message.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-scheduled-message", action, "messageId", "/v1/message-schedules/{id}", 204);
