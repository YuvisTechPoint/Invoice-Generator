/** Parse fetch responses safely — avoids "Unexpected end of JSON input". */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "Server returned an empty response."
        : `Request failed (${res.status}) with an empty response.`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      res.ok
        ? `Server returned invalid JSON: ${preview}`
        : `Request failed (${res.status}): ${preview}`
    );
  }
}
