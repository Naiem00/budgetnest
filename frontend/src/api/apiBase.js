// During local development Vite proxies /api to the Mac's backend.
// Same-origin requests work from both Mac and iPhone without localhost URLs.
export const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || '/api')

export async function readApiResponse(response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ||
      (response.status >= 500
        ? 'BudgetNest backend is unavailable. Check the Terminal running BudgetNest.'
        : `Request failed (${response.status})`))
  }
  if (!data) throw new Error('The backend returned an invalid response.')
  return data
}
