import action from "../../actions/get-bulk-email-status.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-bulk-email-status", action, "bulkEmailId", "/v1/bulk-email/{id}");
