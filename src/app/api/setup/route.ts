import { ApiError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/http";

function registrationClosed(): Response {
  return toErrorResponse(new ApiError(403, "公开注册已关闭"));
}

export function GET(): Response {
  return registrationClosed();
}

export function POST(): Response {
  return registrationClosed();
}
