import { useState } from "react";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { forgotPasswordApi } from "../api/auth";
import { Link } from "react-router-dom";

const schema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email required"),
});

export default function ForgotPassword() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="page">
      <div className="card">
        <h2>Forgot Password</h2>

        {error && <div className="errorBox">{error}</div>}
        {msg && <div className="successBox">{msg}</div>}

        <Formik
          initialValues={{ email: "" }}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            setError("");
            setMsg("");

            try {
              const res = await forgotPasswordApi(values.email);
              if (!res.success) {
                setError(res.message);
              } else {
                setMsg("If the email exists, reset link sent.");
              }
            } catch (e: any) {
              setError(e?.response?.data?.message || "Failed");
            }

            setSubmitting(false);
          }}
        >
          {({ values, handleChange, errors, touched, isSubmitting }) => (
            <Form className="form">
              <label>Email</label>
              <input
                name="email"
                value={values.email}
                onChange={handleChange}
              />
              {touched.email && errors.email && (
                <div className="fieldErr">{errors.email}</div>
              )}

              <button className="btn primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>

              <div style={{ marginTop: 10 }}>
                <Link to="/login">Back to Login</Link>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
