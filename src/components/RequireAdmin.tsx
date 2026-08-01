import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { isAdminUser } from '@/lib/admin';

// Gates /admin — anonymous visitors go to /login, logged-in non-admins go
// home. Real enforcement lives server-side (requireAdmin on /api/admin/*);
// this is just UI gating.
const RequireAdmin = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminUser(user)) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default RequireAdmin;
