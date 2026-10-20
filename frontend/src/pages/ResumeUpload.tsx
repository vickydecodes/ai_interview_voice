import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Star,
  Briefcase,
  GraduationCap,
  Award,
  Zap,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface SkillItem {
  name: string;
  proficiency: number;
  category?: string;
}

interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
}

interface EducationItem {
  degree: string;
  institution: string;
  year?: string;
}

interface ParsedProfile {
  full_name?: string;
  seniority: string;
  years_of_experience: number;
  roles: string[];
  domains: string[];
  skills: SkillItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  strengths: string[];
  weaknesses: string[];
}

const SAMPLE_RESUME_TEXT = `ALEXANDER RIVERA
Email: alex.rivera@example.com | GitHub: github.com/alexrivera
Senior Full-Stack Software Engineer with 5+ years of experience designing scalable distributed web platforms.

EXPERIENCE:
Senior Full Stack Engineer | Apex Cloud Labs (2022 - Present)
- Architected high-concurrency microservices using Python, FastAPI, and Docker, handling 50k+ daily active requests.
- Built interactive real-time telemetry dashboards using React, TypeScript, and Tailwind CSS.
- Optimized persistence layer across PostgreSQL and MongoDB, reducing average query latency by 42%.
- Established automated CI/CD pipelines with GitHub Actions and containerized deployments to AWS ECS.

Software Engineer | DevMatrix Solutions (2020 - 2022)
- Developed RESTful APIs with Node.js and Express.
- Designed caching strategies using Redis, improving cache-hit ratios to 88%.
- Wrote extensive unit and integration tests using PyTest and Jest.

TECHNICAL SKILLS:
- Languages: Python, TypeScript, JavaScript, SQL, HTML/CSS
- Frameworks & Libraries: FastAPI, React, Node.js, Express, Tailwind CSS
- Databases & Storage: PostgreSQL, MongoDB, Redis
- Cloud & DevOps: Docker, Kubernetes, AWS, Git, CI/CD, Linux
- Architecture: REST APIs, Microservices, System Design, Distributed Systems

EDUCATION:
B.S. in Computer Science | State University (2016 - 2020)
`;

export const ResumeUpload: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ParsedProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // New skill input state
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState(3);
  const [newSkillCategory, setNewSkillCategory] = useState("General");

  // Load existing profile if any
  useEffect(() => {
    async function loadCurrentProfile() {
      try {
        const data = await apiRequest<ParsedProfile>("/resume/profile");
        setProfile(data);
      } catch {
        // No resume uploaded yet
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadCurrentProfile();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast.error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 5 MB.");
      return;
    }

    setIsUploading(true);
    setUploadStep("Extracting text and structure...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setTimeout(() => setUploadStep("Evaluating skills, seniority, and projects with LLM..."), 1200);

      const resp = await apiRequest<{ message: string; resume_id: string; parsed_profile: ParsedProfile }>(
        "/resume/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      setProfile(resp.parsed_profile);
      await refreshUser();
      toast.success("Resume parsed successfully! Review your extracted skills below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process resume.");
    } finally {
      setIsUploading(false);
      setUploadStep("");
    }
  };

  const handleLoadSample = async () => {
    const sampleBlob = new Blob([SAMPLE_RESUME_TEXT], { type: "text/plain" });
    const sampleFile = new File([sampleBlob], "alex_rivera_sample_resume.txt", { type: "text/plain" });
    await handleFile(sampleFile);
  };

  const handleAddSkill = () => {
    if (!profile || !newSkillName.trim()) return;
    const exists = profile.skills.some((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) {
      toast.warning("This skill is already in your profile.");
      return;
    }

    const updatedSkills: SkillItem[] = [
      ...profile.skills,
      {
        name: newSkillName.trim(),
        proficiency: newSkillProf,
        category: newSkillCategory || "General",
      },
    ];

    setProfile({ ...profile, skills: updatedSkills });
    setNewSkillName("");
    setNewSkillProf(3);
    toast.success(`Added ${newSkillName.trim()} (Level ${newSkillProf})`);
  };

  const handleRemoveSkill = (skillIndex: number) => {
    if (!profile) return;
    const updated = profile.skills.filter((_, idx) => idx !== skillIndex);
    setProfile({ ...profile, skills: updated });
  };

  const handleSkillProficiencyChange = (skillIndex: number, newProf: number) => {
    if (!profile) return;
    const updated = [...profile.skills];
    updated[skillIndex] = { ...updated[skillIndex], proficiency: newProf };
    setProfile({ ...profile, skills: updated });
  };

  const handleSaveAndConfirm = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await apiRequest<ParsedProfile>("/resume/profile", {
        method: "PUT",
        body: JSON.stringify({ parsed_profile: profile }),
      });
      toast.success("Profile confirmed! Unlocks calculated.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Resume Vault & Skill Profile
            </h1>
            <Badge variant="tier">
              Phase 2
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Upload your resume to extract verified skills and unlock company tiers in the interview campaign.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLoadSample}
          disabled={isUploading}
          className="border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 gap-1.5"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>Load Sample Tech Resume</span>
        </Button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
            : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-200 shadow-sm">
            {isUploading ? (
              <Zap className="h-8 w-8 text-blue-600 animate-bounce" />
            ) : (
              <UploadCloud className="h-8 w-8 text-blue-600" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {isUploading ? "Processing Candidate Resume..." : "Drag & drop your resume file here"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              {isUploading
                ? uploadStep
                : "Supports PDF, DOCX, and TXT (Max 5 MB). Extracted skills, experience, and projects will be mapped to company tier unlocks."}
            </p>
          </div>

          {!isUploading && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="game"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Browse Files</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoadingProfile && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-slate-200" />
          <Skeleton className="h-48 w-full bg-slate-200" />
        </div>
      )}

      {/* Extracted Profile Review & Edit UI */}
      {profile && !isLoadingProfile && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Verified Player Profile</h2>
                <p className="text-xs text-slate-500">
                  Review and refine your skills before calculating company unlocks.
                </p>
              </div>
            </div>

            <Button
              variant="game"
              onClick={handleSaveAndConfirm}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Confirm & View Level Map"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Candidate Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200 bg-white">
              <div className="text-xs text-slate-500 uppercase font-bold">Candidate</div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {profile.full_name || "Candidate"}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 truncate">
                {profile.roles?.join(", ") || "Software Engineer"}
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="text-xs text-slate-500 uppercase font-bold">Seniority Tier</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="xp" className="text-xs">
                  {profile.seniority}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Calculated from depth of responsibilities</div>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="text-xs text-slate-500 uppercase font-bold">Years of Experience</div>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  value={profile.years_of_experience}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile({ ...profile, years_of_experience: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 w-20 text-sm font-bold text-blue-700 bg-slate-50"
                />
                <span className="text-xs text-slate-600 font-medium">years</span>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="text-xs text-slate-500 uppercase font-bold">Total Skills Extracted</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {profile.skills.length}
              </div>
              <div className="text-[11px] text-slate-500">Available to match company profiles</div>
            </Card>
          </div>

          {/* Skills Management Section */}
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                    <Award className="h-5 w-5 text-blue-600" />
                    <span>Skills & Proficiency Matrix (1 to 5)</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Companies require minimum skill proficiencies. Click the stars or badges to calibrate your level.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Skill Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Input
                  placeholder="Add skill (e.g. Docker, GraphQL, Kubernetes)..."
                  value={newSkillName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkillName(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 font-medium shadow-xs"
                >
                  <option value="Languages">Languages</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Databases">Databases</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                  <option value="Architecture">Architecture</option>
                  <option value="General">General</option>
                </select>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Level:</span>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewSkillProf(lvl)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                        newSkillProf >= lvl
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="game"
                  onClick={handleAddSkill}
                  className="w-full sm:w-auto text-xs whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Skill
                </Button>
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {profile.skills.map((skill, idx) => (
                  <div
                    key={`${skill.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{skill.name}</span>
                        {skill.category && (
                          <span className="text-[10px] font-medium text-slate-600 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                            {skill.category}
                          </span>
                        )}
                      </div>
                      {/* Interactive Proficiency Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleSkillProficiencyChange(idx, star)}
                            className="cursor-pointer transition-transform hover:scale-110"
                            title={`Set proficiency to ${star}/5`}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                star <= skill.proficiency
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-[11px] font-mono font-bold text-slate-600 ml-1">
                          {skill.proficiency}/5
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSkill(idx)}
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projects and Education preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span>Key Experience & Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.projects && profile.projects.length > 0 ? (
                  profile.projects.map((proj, pIdx) => (
                    <div key={pIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-bold text-xs text-slate-800">{proj.title}</div>
                      <p className="text-[11px] text-slate-600 mt-1">{proj.description}</p>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proj.technologies.map((t, tIdx) => (
                            <Badge key={tIdx} variant="secondary" className="text-[10px] py-0 bg-white">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No projects specified.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <GraduationCap className="h-4 w-4 text-emerald-600" />
                  <span>Education & Domain Strengths</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.education && profile.education.length > 0 && (
                  <div className="space-y-2">
                    {profile.education.map((edu, eIdx) => (
                      <div key={eIdx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="font-bold text-xs text-slate-800">{edu.degree}</div>
                        <div className="text-[11px] text-slate-600">
                          {edu.institution} {edu.year ? `(${edu.year})` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {profile.strengths && profile.strengths.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-700">Identified Strengths:</span>
                    <ul className="mt-1 space-y-1">
                      {profile.strengths.map((str, sIdx) => (
                        <li key={sIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Confirm Button Footer */}
          <div className="flex justify-end pt-4">
            <Button
              variant="game"
              size="lg"
              onClick={handleSaveAndConfirm}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Confirm Profile & Calculate Unlocks"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
