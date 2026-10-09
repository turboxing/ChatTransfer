export async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || response.statusText);
  }

  return data;
}
