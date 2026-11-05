export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Parlio-Request": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "La connexion est interrompue. Vérifiez votre réseau, puis réessayez.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Le serveur ne répond pas correctement. Réessayez dans un instant.",
    );
  }
  if (!response.ok)
    throw new Error(data.error || "Cette action a échoué. Réessayez.");
  return data as T;
}
