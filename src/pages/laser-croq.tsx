import { Navigate, useLocation } from "react-router-dom";

// Laser Croq folded into the Bande page as its own tab (see bande.tsx) —
// this route stays only so old links/bookmarks to /laser-croq keep working.
const LaserCroqRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("tab", "laser");
  return <Navigate to={`/bande?${params.toString()}`} replace />;
};

export default LaserCroqRedirect;
