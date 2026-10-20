import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, FileText, LogOut, Mic } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm group-hover:bg-blue-700 transition-colors">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                AI Voice <span className="text-blue-600">Interview</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block font-medium">
              Real-Time AI Voice Interview Simulator
            </p>
          </div>
        </Link>

        {/* Navigation links & User actions */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1.5">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="text-xs font-semibold"
            >
              <Link to="/" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>Select Company</span>
              </Link>
            </Button>
            <Button
              variant={location.pathname === "/resume" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="text-xs font-semibold"
            >
              <Link to="/resume" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-600" />
                <span>Resume Parser</span>
              </Link>
            </Button>
          </nav>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user.full_name || user.email.split("@")[0]}
              </span>
              <span className="text-[10px] text-slate-500">{user.email}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
