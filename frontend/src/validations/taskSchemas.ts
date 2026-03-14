import * as Yup from "yup";

const validDate = (value?: string | null) => {
  if (!value) return true;
  return !isNaN(new Date(value).getTime());
};

const validFiles = (files?: File[]) => {
  if (!files || files.length === 0) return true;

  const allowedMime = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  return files.every(
    (file) =>
      allowedMime.includes(file.type) || file.type.startsWith("image/")
  );
};

export const adminCreateTaskSchema = Yup.object({
  title: Yup.string()
    .trim()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),

  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(5, "Description must be at least 5 characters")
    .max(2000, "Description cannot exceed 2000 characters"),

  status: Yup.string()
    .oneOf(["PENDING", "IN_PROGRESS", "COMPLETED"], "Invalid status")
    .required("Status is required"),

  priority: Yup.string()
    .oneOf(["LOW", "MEDIUM", "HIGH"], "Invalid priority")
    .required("Priority is required"),

  due_date: Yup.string()
    .nullable()
    .test("valid-date", "Invalid due date", validDate),

  owner_id: Yup.string().required("Owner is required"),

  files: Yup.mixed<File[]>()
    .test("valid-files", "Only PDF, DOCX, and image files are allowed", (value) =>
      validFiles(value as File[] | undefined)
    )
    .test("max-files", "Maximum 3 files allowed", (value) => {
      const files = value as File[] | undefined;
      return !files || files.length <= 3;
    }),
});

export const userCreateTaskSchema = Yup.object({
  title: Yup.string()
    .trim()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),

  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(5, "Description must be at least 5 characters")
    .max(2000, "Description cannot exceed 2000 characters"),

  status: Yup.string()
    .oneOf(["PENDING", "IN_PROGRESS", "COMPLETED"], "Invalid status")
    .required("Status is required"),

  priority: Yup.string()
    .oneOf(["LOW", "MEDIUM", "HIGH"], "Invalid priority")
    .required("Priority is required"),

  due_date: Yup.string()
    .nullable()
    .test("valid-date", "Invalid due date", validDate),

  files: Yup.mixed<File[]>()
    .test("valid-files", "Only PDF, DOCX, and image files are allowed", (value) =>
      validFiles(value as File[] | undefined)
    )
    .test("max-files", "Maximum 3 files allowed", (value) => {
      const files = value as File[] | undefined;
      return !files || files.length <= 3;
    }),
});

export const editTaskSchema = Yup.object({
  title: Yup.string()
    .trim()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),

  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(5, "Description must be at least 5 characters")
    .max(2000, "Description cannot exceed 2000 characters"),

  status: Yup.string()
    .oneOf(["PENDING", "IN_PROGRESS", "COMPLETED"], "Invalid status")
    .required("Status is required"),

  priority: Yup.string()
    .oneOf(["LOW", "MEDIUM", "HIGH"], "Invalid priority")
    .required("Priority is required"),

  due_date: Yup.string()
    .nullable()
    .test("valid-date", "Invalid due date", validDate),
});