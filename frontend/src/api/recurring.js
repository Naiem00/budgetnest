import { API_BASE_URL, readApiResponse } from './apiBase'

async function request(path, token, options={}) {
  const response=await fetch(`${API_BASE_URL}/recurring${path}`,{
    ...options,
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`,...options.headers},
  })
  return readApiResponse(response)
}
export const listRecurring=(token,month)=>request(`?month=${encodeURIComponent(month)}`,token)
export const createRecurring=(token,data)=>request('',token,{method:'POST',body:JSON.stringify(data)})
export const updateRecurring=(token,id,data)=>request(`/${id}`,token,{method:'PATCH',body:JSON.stringify(data)})
export const setRecurringActive=(token,id,active)=>request(`/${id}/status`,token,{method:'PATCH',body:JSON.stringify({active})})
export const recordRecurringMonth=(token,id,month)=>request(`/${id}/post`,token,{method:'POST',body:JSON.stringify({month})})
