import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data
    const message = data?.error || error.message || '请求失败'
    const customError = new Error(message) as Error & {
      code?: string
      status?: number
    }
    customError.code = data?.code
    customError.status = error.response?.status
    return Promise.reject(customError)
  }
)

export default api
