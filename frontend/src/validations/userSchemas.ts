import * as Yup from "yup";

export const createUserSchema = Yup.object({
  email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Email is required"),

  role: Yup.string()
    .oneOf(["A", "B"], "Role must be A or B")
    .required("Role is required"),
});