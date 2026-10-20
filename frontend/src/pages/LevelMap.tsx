import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Upload, Sparkles, MapPin, ArrowRight } from "lucide-react";

export const LevelMap: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
      {/* Player Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="xp" className="px-2.5 py-0.5">
                <Trophy className="h-3.5 w-3.5 mr-1" />
                TIER 1 CANDIDATE
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-400">
                Phase 1 Active
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to the Arena, {user?.full_name || "Candidate"}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Upload your resume to calculate skill matches against tech company tiers, unlock interview levels, and step into the AI voice simulation room.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="game" size="lg" asChild className="gap-2">
              <Link to="/resume">
                <Upload className="h-4 w-4" />
                <span>Upload Resume</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20">
              <Upload className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">1. Resume Analysis</CardTitle>
            <CardDescription className="text-xs">
              Instant parsing of skills, proficiencies, projects, and domain experience.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2 border border-indigo-500/20">
              <MapPin className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">2. Tier Unlock Engine</CardTitle>
            <CardDescription className="text-xs">
              Deterministic skill match scoring against 10+ tech company profiles.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">3. AI Voice Interview</CardTitle>
            <CardDescription className="text-xs">
              Real-time conversational voice interview with speech recognition and instant report.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
