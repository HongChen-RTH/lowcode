import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { storeAuth } from "../hooks/useStoreAuth";
import { message } from "antd";

export const BASE_URL = "http://8.134.163.0:5000/api";
const request = axios.create({ baseURL: BASE_URL });

// 请求拦截器
request.interceptors.request.use((config) => {
  if (storeAuth.token) {
    config.headers.Authorization = storeAuth.token;
  }
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const data = response?.data;
    if (data.code === 0 && data.msg !== undefined) {
      message.success(data.msg);
    }
    return response;
  },
  (err) => {
    const { code, response } = err;
    if (code === "ERR_BAD_REQUEST") {
      message.warning(response?.data?.msg ?? "出现未知错误");
    }
  }
);

export default async function makeRequest(
  url: string,
  options?: AxiosRequestConfig
) {
  return (await request({ url, ...options })).data;
}
