function errorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    const message = payload.error.trim();
    if (message.length > 0 && message.length <= 120) return message;
  }
  if (status === 400) return "请求格式无效";
  if (status === 401) return "用户名或密码不正确";
  if (status === 403) return "没有权限执行这个操作";
  if (status === 413) return "请求内容过大";
  return "服务器暂时无法完成请求";
}

export async function requestJson<T>(
  url: string,
  init?: { method?: string; body?: unknown; csrf?: string },
): Promise<T> {
  const headers = new Headers();
  if (init?.body !== undefined) headers.set("content-type", "application/json");
  if (init?.csrf) headers.set("x-csrf-token", init.csrf);
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin) {
    throw new Error("抽奖请求只能发给当前网站");
  }
  let response: Response;
  try {
    response = await fetch(target.href, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`无法连接抽奖服务器（${error.message}）`);
    }
    throw error;
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(errorMessage(response.status, payload));
  }
  return payload as T;
}
