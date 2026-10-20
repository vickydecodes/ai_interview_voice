import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Compass, FileText, LogOut, Flame, Sparkles } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Calculate XP towards next level (e.g. each level is 500 XP)
  const currentLevel = user.level || 1;
  const currentXp = user.xp || 0;
  const xpInCurrentLevel = currentXp % 500;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 500) * 100));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                LevelUp
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Interview
              </span>
            </div>
            <p className="text-[10px] text-slate-500 -mt-1 hidden sm:block font-medium">
              Gamified AI Voice Simulator
            </p>
          </div>
        </Link>

        {/* Gamified Level & XP status */}
        <div className="hidden md:flex items-center gap-4 bg-slate-50 border border-slate-200/90 rounded-full px-4 py-1.5 shadow-xs">
          <Badge variant="xp" className="flex items-center gap-1 py-0.5 px-2.5">
            <Trophy className="h-3 w-3 text-amber-600" />
            <span>LVL {currentLevel}</span>
          </Badge>

          <div className="flex flex-col gap-1 w-36">
            <div className="flex justify-between text-[11px] font-semibold text-slate-700">
              <span className="text-slate-500 font-normal">XP Progress</span>
              <span className="text-blue-600 font-mono">{xpInCurrentLevel}/500</span>
            </div>
            <Progress value={xpPercent} className="h-1.5 bg-slate-200" indicatorColor="bg-gradient-to-r from-blue-600 to-emerald-500" />
          </div>

          {user.badges && user.badges.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-slate-700 font-semibold">
                {user.badges.length} {user.badges.length === 1 ? "Badge" : "Badges"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation links & User actions */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="text-xs"
            >
              <Link to="/" className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-blue-600" />
                <span>Level Map</span>
              </Link>
            </Button>
            <Button
              variant={location.pathname === "/resume" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="text-xs"
            >
              <Link to="/resume" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>My Resume</span>
              </Link>
            </Button>
          </nav>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex flex-col text-right">
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
