import { useState } from "react";
import { useNavigate , Link } from "react-router-dom";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { loginApi } from "../api/auth";
import { useAuth } from "../store/authStore";


const schema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email required"),
  password: Yup.string().min(8, "Min 8 chars").required("Password required"),
});

export default function Login() {
  const nav = useNavigate();
  const { setAuth } = useAuth();
  const [serverError, setServerError] = useState("");

  return (
    <div className="page">
      <div className="card">
        <h2>Login</h2>
        {serverError && <div className="errorBox">{serverError}</div>}

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            setServerError("");
            try {
              const res = await loginApi(values.email, values.password);
              if (!res.success || !res.data) {
                setServerError(res.message || "Login failed");
                return;
              }
              setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
              nav(res.data.user.role === "ADMIN" ? "/admin" : "/me");
            } catch (e: any) {
              setServerError(e?.response?.data?.message || "Login failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, handleChange, touched, errors, isSubmitting }) => (
            <Form className="form">
              <label>Email</label>
              <input name="email" value={values.email} onChange={handleChange} />
              {touched.email && errors.email && <div className="fieldErr">{errors.email}</div>}

              <label>Password</label>
              <input name="password" type="password" value={values.password} onChange={handleChange} />
              {touched.password && errors.password && <div className="fieldErr">{errors.password}</div>}

              <button className="btn primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
              <div style={{ marginTop: 10}}>
  <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
</div>

            </Form>
          )}
        </Formik>

        
      </div>
    </div>
  );
}
