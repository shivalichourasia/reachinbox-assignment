import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/Feedback";
export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate("/login?error=missing_token");
      return;
    }
    localStorage.setItem("token", token);
    refresh().then(() => navigate("/dashboard"));
  }, []);
  return <LoadingSpinner label="Signing you in..." />;
}
