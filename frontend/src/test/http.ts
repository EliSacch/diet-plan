import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

export function axiosFailure(status: number, data: unknown) {
  return new AxiosError("Request failed", String(status), undefined, undefined, {
    data,
    status,
    statusText: "",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });
}

export function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

export function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
}
