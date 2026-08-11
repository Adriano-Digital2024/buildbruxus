import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import AuthPage from "./components/AuthPage";
import ChatPage from "./pages/ChatPage";
import PricingPage from "./pages/PricingPage";
import AccountPage from "./pages/AccountPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Carregando...
      </div>
    );
  }
  if (!user) return <AuthPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Protected><ChatPage /></Protected>} />
            <Route path="/account" element={<Protected><AccountPage /></Protected>} />
            <Route path="/pricing" element={<Protected><PricingPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </AuthProvider>
  );
}