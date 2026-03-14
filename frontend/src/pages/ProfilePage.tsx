import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { yupResolver } from "@hookform/resolvers/yup";
import Navbar from "../components/Navbar";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "../api/profile";
import {
  profileZodSchema,
  changePasswordYupSchema,
  type ProfileFormValues,
  type ChangePasswordFormValues,
} from "../validations/profileSchemas";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const backToDashboard = () => {
    if (user?.role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/me");
    }
  };

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileZodSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      bio: "",
      notify_email: true,
      notify_inapp: true,
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(changePasswordYupSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      profileForm.reset({
        full_name: profileQuery.data.full_name || "",
        phone: profileQuery.data.phone || "",
        bio: profileQuery.data.bio || "",
        notify_email: profileQuery.data.notify_email,
        notify_inapp: profileQuery.data.notify_inapp,
      });
    }
  }, [profileQuery.data, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: (values: UpdateProfileInput) => updateMyProfile(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      alert("Profile updated successfully");
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordInput) => changeMyPassword(values),
    onSuccess: () => {
      passwordForm.reset();
      alert("Password changed successfully");
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to change password");
    },
  });

  if (profileQuery.isPending) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <div className="profile-shell">
            <div className="card">Loading profile...</div>
          </div>
        </div>
      </>
    );
  }

  if (profileQuery.isError) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <div className="profile-shell">
            <div className="card">Failed to load profile.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="profile-page">
        <div className="profile-shell">
          <div className="profile-topbar">
            <button className="btn back-btn" type="button" onClick={backToDashboard}>
              ← Back
            </button>
          </div>

          <div className="profile-heading-block">
            <h1 className="profile-page-title">Profile Settings</h1>
            <p className="profile-page-subtitle">
              Manage your profile information and password.
            </p>
          </div>

          <div className="profile-grid">
            <section className="card profile-card">
              <h2>Profile Details</h2>

              <form
                onSubmit={profileForm.handleSubmit((values) =>
                  updateProfileMutation.mutate(values)
                )}
                className="form-grid"
              >
                <div>
                  <label>Full Name</label>
                  <input {...profileForm.register("full_name")} />
                  {profileForm.formState.errors.full_name && (
                    <p className="error-text">
                      {profileForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label>Email</label>
                  <input value={profileQuery.data?.email || ""} disabled />
                </div>

                <div>
                  <label>Role</label>
                  <input value={profileQuery.data?.role || ""} disabled />
                </div>

                <div>
                  <label>Phone</label>
                  <input {...profileForm.register("phone")} />
                  {profileForm.formState.errors.phone && (
                    <p className="error-text">
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="full-width">
                  <label>Bio</label>
                  <textarea rows={4} {...profileForm.register("bio")} />
                  {profileForm.formState.errors.bio && (
                    <p className="error-text">
                      {profileForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>

                <div className="full-width profile-checkboxes">
                  <label className="checkbox-row">
                    <input type="checkbox" {...profileForm.register("notify_email")} />
                    <span>Notify by Email</span>
                  </label>

                  <label className="checkbox-row">
                    <input type="checkbox" {...profileForm.register("notify_inapp")} />
                    <span>Notify In App</span>
                  </label>
                </div>

                <div className="full-width">
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>

            <section className="card profile-card">
              <h2>Change Password</h2>

              <form
                onSubmit={passwordForm.handleSubmit((values) =>
                  changePasswordMutation.mutate(values)
                )}
                className="form-grid"
              >
                <div className="full-width">
                  <label>Current Password</label>
                  <input
                    type="password"
                    {...passwordForm.register("current_password")}
                  />
                  {passwordForm.formState.errors.current_password && (
                    <p className="error-text">
                      {passwordForm.formState.errors.current_password.message}
                    </p>
                  )}
                </div>

                <div className="full-width">
                  <label>New Password</label>
                  <input type="password" {...passwordForm.register("new_password")} />
                  {passwordForm.formState.errors.new_password && (
                    <p className="error-text">
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="full-width">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    {...passwordForm.register("confirm_password")}
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="error-text">
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <div className="full-width">
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending
                      ? "Updating..."
                      : "Change Password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}