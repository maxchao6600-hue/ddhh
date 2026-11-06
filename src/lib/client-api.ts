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
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "请求失败";
    throw new Error(message);
  }
  return payload as T;
}
