import { z } from "zod";
import * as yup from "yup";

export const profileZodSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Max 120 characters"),
   phone: z
  .string()
  .regex(/^(\+91\s?)?\d{10}$/, "Phone must be 10 digits with optional +91"),
  bio: z.string().max(500, "Bio must be at most 500 characters"),
  notify_email: z.boolean(),
  notify_inapp: z.boolean(),
});


export type ProfileFormValues = z.infer<typeof profileZodSchema>;

export const changePasswordYupSchema = yup.object({
  current_password: yup.string().required("Current password is required"),
  new_password: yup
    .string()
    .required("New password is required")
    .min(8, "At least 8 characters")
    .matches(/[a-z]/, "Need one lowercase letter")
    .matches(/[A-Z]/, "Need one uppercase letter")
    .matches(/\d/, "Need one number")
    .matches(/[^\w\s]/, "Need one symbol"),
  confirm_password: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("new_password")], "Passwords do not match"),
});

export type ChangePasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};