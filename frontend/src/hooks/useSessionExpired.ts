import { useEffect, useState } from "react";

export function useSessionExpired() {
  const [expired, setExpired] = useState(
    localStorage.getItem("SESSION_EXPIRED") === "1"
  );

  useEffect(() => {
    const sync = () => {
      setExpired(localStorage.getItem("SESSION_EXPIRED") === "1");
    };

    sync();
    window.addEventListener("SESSION_EXPIRED_EVENT", sync);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "SESSION_EXPIRED") sync();
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("SESSION_EXPIRED_EVENT", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return expired;
}