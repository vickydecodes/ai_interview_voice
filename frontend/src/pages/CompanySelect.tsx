import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Search,
  Briefcase,
  Mic,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  Building2,
  Star,
  Info,
  Code2,
} from "lucide-react";

interface SkillRequirement {
  name: string;
  min_proficiency: number;
  weight: number;
}

interface MatchedSkillDetail {
  name: string;
  candidate_prof: number;
  required_prof: number;
  weight: number;
  points_earned: number;
  max_points: number;
}

interface MissingSkillDetail {
  name: string;
  candidate_prof: number;
  required_prof: number;
  weight: number;
  points_gap: number;
  impact_percentage: number;
}

interface CompanyUnlockStatus {
  company_id: string;
  company_name: string;
  match_score: number;
  matched_skills: MatchedSkillDetail[];
  missing_skills: MissingSkillDetail[];
  nice_to_have_matches: string[];
  explanation: string;
}

interface CompanyItem {
  company_id: string;
  name: string;
  tagline: string;
  logo_icon: string;
  color_gradient: string;
  roles_hiring: string[];
  required_skills: SkillRequirement[];
  nice_to_have_skills: string[];
  interview_style: string;
  difficulty: string;
  unlock_status: CompanyUnlockStatus;
}

interface MapOverviewData {
  candidate: {
    name: string;
    seniority: string;
    years_of_experience: number;
    skills_count: number;
    has_uploaded_resume: boolean;
  };
  companies: CompanyItem[];
}

export const CompanySelect: React.FC = () => {
  const navigate = useNavigate();

  const [mapData, setMapData] = useState<MapOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<MapOverviewData>("/companies/map/overview");
      setMapData(data);
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleStartInterview = (companyId: string) => {
    navigate(`/interview/${companyId}`);
  };

  const filteredCompanies = useMemo(() => {
    if (!mapData?.companies) return [];
    if (!searchQuery.trim()) return mapData.companies;
    const q = searchQuery.toLowerCase();
    return mapData.companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.roles_hiring.some((r) => r.toLowerCase().includes(q)) ||
        c.required_skills.some((s) => s.name.toLowerCase().includes(q)) ||
        c.tagline.toLowerCase().includes(q)
    );
  }, [mapData, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            <span>Select Target Company</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose a target company to practice an interactive, voice-based technical interview aligned with your resume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-2 text-xs font-semibold">
            <Link to="/resume">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>
                {mapData?.candidate.has_uploaded_resume ? "Update Resume" : "Upload Resume"}
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search companies by name, role, or required skill..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {mapData?.candidate && (
          <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
            Showing <span className="font-bold text-slate-800">{filteredCompanies.length}</span> companies
            {mapData.candidate.skills_count > 0 && (
              <span> • Matched against <strong className="text-blue-600">{mapData.candidate.skills_count}</strong> skills</span>
            )}
          </div>
        )}
      </div>

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-56 w-full bg-slate-200" />
          <Skeleton className="h-56 w-full bg-slate-200" />
          <Skeleton className="h-56 w-full bg-slate-200" />
        </div>
      )}

      {/* Companies Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((comp) => {
            const status = comp.unlock_status;
            const matchScore = status?.match_score || 0;

            return (
              <Card
                key={comp.company_id}
                className="border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {comp.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {comp.tagline}
                      </CardDescription>
                    </div>

                    <Badge
                      variant={matchScore >= 60 ? "success" : matchScore >= 40 ? "warning" : "secondary"}
                      className="text-xs font-bold shrink-0"
                    >
                      {matchScore}% Match
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  {/* Hiring Roles */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Hiring Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.roles_hiring.map((role, idx) => (
                        <Badge key={idx} variant="outline" className="text-[11px] py-0.5 bg-slate-50">
                          <Briefcase className="h-3 w-3 mr-1 text-slate-400" />
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Required Skills preview */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Key Required Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.required_skills.slice(0, 4).map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                        >
                          {s.name}
                        </span>
                      ))}
                      {comp.required_skills.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{comp.required_skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interview Style */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">Interview Focus: </span>
                    {comp.interview_style}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2 font-bold"
                      onClick={() => handleStartInterview(comp.company_id)}
                    >
                      <Mic className="h-4 w-4" />
                      <span>Start Voice Interview</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 text-slate-600 hover:text-slate-900"
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsDrawerOpen(true);
                      }}
                      title="View Requirements & Skill Match"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Company Details Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        {selectedCompany && (
          <DrawerContent className="space-y-6">
            <DrawerHeader className="pb-4">
              <DrawerTitle className="text-xl font-bold text-slate-900">
                {selectedCompany.name}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-slate-500 mt-1">
                {selectedCompany.tagline}
              </DrawerDescription>
            </DrawerHeader>

            {/* Match summary */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Skill Match Score</span>
                <div className="text-2xl font-black text-slate-900">
                  {selectedCompany.unlock_status?.match_score || 0}%
                </div>
              </div>
              <Badge variant="outline" className="text-xs py-1 px-3 font-semibold">
                {selectedCompany.difficulty} Focus
              </Badge>
            </div>

            {/* Interview Style */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Interview Focus & Topics</span>
              <p className="text-xs text-slate-600 p-3 bg-white border border-slate-200 rounded-lg">
                {selectedCompany.interview_style}
              </p>
            </div>

            {/* Required Skills Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Required Skills</span>
                <span>Your Proficiency / Min Required</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedCompany.required_skills.map((req, idx) => {
                  const matched = selectedCompany.unlock_status?.matched_skills?.find(
                    (m) => m.name.toLowerCase() === req.name.toLowerCase()
                  );
                  const isMet = matched && matched.candidate_prof >= req.min_proficiency;
                  const candProf = matched ? matched.candidate_prof : 0;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                        isMet
                          ? "bg-emerald-50/50 border-emerald-200"
                          : candProf > 0
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isMet ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-bold text-slate-800">{req.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= candProf
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-mono font-bold text-slate-700">
                          {candProf}/{req.min_proficiency}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DrawerFooter className="pt-4">
              <Button
                variant="default"
                size="lg"
                onClick={() => handleStartInterview(selectedCompany.company_id)}
                className="w-full gap-2 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mic className="h-4 w-4" />
                <span>Start Voice Interview Room</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DrawerFooter>
          </DrawerContent>
        )}
      </Drawer>
    </div>
  );
};

export default CompanySelect;
