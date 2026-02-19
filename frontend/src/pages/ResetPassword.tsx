import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { resetPasswordApi } from "../api/auth";

const schema = Yup.object({
  new_password: Yup.string().min(8, "Min 8 characters").required("Password required"),
});

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="page">
      <div className="card">
        <h2>Reset Password</h2>

        {!token && <div className="errorBox">Invalid reset link.</div>}
        {error && <div className="errorBox">{error}</div>}
        {msg && <div className="successBox">{msg}</div>}

        <Formik
          initialValues={{ new_password: "" }}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            setError("");
            setMsg("");

            try {
              const res = await resetPasswordApi(token, values.new_password);
              if (!res.success) {
                setError(res.message);
              } else {
                setMsg("Password reset successful.");
                setTimeout(() => navigate("/login"), 1000);
              }
            } catch (e: any) {
              setError(e?.response?.data?.message || "Failed");
            }

            setSubmitting(false);
          }}
        >
          {({ values, handleChange, errors, touched, isSubmitting }) => (
            <Form className="form">
              <label>New Password</label>
              <input
                name="new_password"
                type="password"
                value={values.new_password}
                onChange={handleChange}
                disabled={!token}
              />
              {touched.new_password && errors.new_password && (
                <div className="fieldErr">{errors.new_password}</div>
              )}

              <button className="btn primary" type="submit" disabled={isSubmitting || !token}>
                {isSubmitting ? "Resetting..." : "Reset Password"}
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
