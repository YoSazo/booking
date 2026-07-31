export async function fetchWithTimeout(input, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The connection timed out. Try again.');
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
