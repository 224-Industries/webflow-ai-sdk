const BASE_URL = "https://api.webflow.com/v2";

export const getApiKey = (): string => {
  const apiKey = process.env.WEBFLOW_API_KEY;
  if (!apiKey) {
    throw new Error("WEBFLOW_API_KEY environment variable is required");
  }
  return apiKey;
};

export const callApi = async (
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: Record<string, unknown>;
    params?: Record<string, string | number | undefined>;
  } = {}
): Promise<Record<string, unknown>> => {
  const { method = "GET", body, params } = options;

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webflow API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
};
