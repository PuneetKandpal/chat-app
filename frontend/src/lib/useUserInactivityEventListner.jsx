import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";

export function useUserInactivityEventListener(timeInSeconds) {
  const timerRef = useRef();
  const { disconnectSocket } = useAuthStore();
  const events = ["click", "keydown"];

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      console.log("Disconnect gets called");
      disconnectSocket();
    }, timeInSeconds * 1000);
  };

  useEffect(() => {
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
