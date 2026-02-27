// src/api/types.ts
export type ApiResp<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
};