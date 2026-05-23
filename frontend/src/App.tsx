import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Record } from "@/pages/Record";
import { Hotwords } from "@/pages/Hotwords";
import { History } from "@/pages/History";
import { useAuthStore } from "@/stores/auth";

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Record />} />
        <Route path="/hotwords" element={<Hotwords />} />
        <Route path="/history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
