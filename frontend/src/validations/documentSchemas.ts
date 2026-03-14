import * as Yup from "yup";

export const sendDocumentSchema = Yup.object({
  to_email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Recipient email is required"),

  subject: Yup.string()
    .trim()
    .required("Subject is required")
    .min(3, "Subject must be at least 3 characters")
    .max(120, "Subject cannot exceed 120 characters"),

  body: Yup.string()
    .trim()
    .required("Message is required")
    .min(5, "Message must be at least 5 characters")
    .max(3000, "Message cannot exceed 3000 characters"),

  file: Yup.mixed<File>()
    .required("Document file is required")
    .test("fileType", "Only PDF, DOCX, and image files are allowed", (file) => {
      if (!file) return false;
      const allowed = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      return allowed.includes(file.type) || file.type.startsWith("image/");
    })
    .test("fileSize", "File must be 10MB or less", (file) => {
      if (!file) return false;
      return file.size <= 10 * 1024 * 1024;
    }),
});