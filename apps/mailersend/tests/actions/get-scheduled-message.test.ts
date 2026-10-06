import action from "../../actions/get-scheduled-message.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-scheduled-message", action, "messageId", "/v1/message-schedules/{id}");
