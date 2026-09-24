/**
 * Futures Lab: Safe API Fetch Utility
 *
 * Prevents "Unexpected token '<' / 'T' — response is not valid JSON" errors
 * by validating response content-types and converting server errors into
 * clean, actionable error messages.
 */

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get('content-type') || '';

  if (contentType.toLowerCase().includes('application/json')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
      throw new Error(msg);
    }
    return data as T;
  }

  // Non-JSON response handling (e.g. 404 HTML, 500 HTML)
  const rawText = await res.text().catch(() => '');
  let errorMessage: string;

  if (res.status === 404) {
    errorMessage = 'API endpoint not found (404). Backend serverless function is unreachable or route is misconfigured.';
  } else if (!res.ok) {
    const cleanSnippet = rawText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    errorMessage = cleanSnippet
      ? `Server error (${res.status}): ${cleanSnippet}`
      : `HTTP ${res.status} (${res.statusText || 'Error'})`;
  } else {
    errorMessage = 'Server returned unexpected non-JSON format';
  }

  throw new Error(errorMessage);
}

/**
 * Safe fetch for background polling where failures should quietly return null
 */
export async function safePollJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.toLowerCase().includes('application/json')) {
      return (await res.json()) as T;
    }
    return null;
  } catch {
    return null;
  }
}
