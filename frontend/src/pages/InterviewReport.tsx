import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  RotateCcw,
  Clock,
  Sparkles,
  TrendingUp,
  FileText,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface QuestionEval {
  question: string;
  candidate_answer: string;
  score: number;
  feedback: string;
  suggested_answer: string;
}

interface InterviewReportData {
  interview_id: string;
  company_id: string;
  company_name: string;
  role: string;
  duration_minutes: number;
  total_questions: number;
  overall_score: number;
  selection_probability: number;
  communication_score: number;
  technical_depth_score: number;
  problem_solving_score: number;
  confidence_score: number;
  clarity_score: number;
  key_strengths: string[];
  areas_for_improvement: string[];
  question_evaluations: QuestionEval[];
  created_at: string;
}

export const InterviewReport: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<InterviewReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      if (!interviewId) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiRequest<InterviewReportData>(`/interviews/${interviewId}/report`);
        setReport(data);
      } catch (err: any) {
        console.error("Failed to load interview report:", err);
        setError(err.message || "Failed to load report.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [interviewId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-64 bg-slate-200" />
        <Skeleton className="h-44 w-full bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full bg-slate-200" />
          <Skeleton className="h-48 w-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center space-y-4">
        <div className="p-4 rounded-full bg-red-100 text-red-600 w-16 h-16 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Report Not Available</h2>
        <p className="text-xs text-slate-600">{error || "The requested interview report could not be found."}</p>
        <Button asChild variant="outline">
          <Link to="/">Back to Company Selection</Link>
        </Button>
      </div>
    );
  }

  const getDecisionBadge = (prob: number) => {
    if (prob >= 75) {
      return <Badge variant="success" className="text-xs font-bold py-1 px-3">High Probability • Strong Hire</Badge>;
    }
    if (prob >= 50) {
      return <Badge variant="warning" className="text-xs font-bold py-1 px-3">Moderate Probability • Competitive</Badge>;
    }
    return <Badge variant="destructive" className="text-xs font-bold py-1 px-3">Needs Skill Practice</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Voice Interview Assessment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-blue-600" />
            <span>{report.company_name} Performance Report</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Role: <strong className="text-slate-800">{report.role}</strong> • Duration: {report.duration_minutes.toFixed(1)} mins • {report.total_questions} Questions Evaluated
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-2 text-xs font-semibold">
            <Link to={`/interview/${report.company_id}`}>
              <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
              <span>Retake Interview</span>
            </Link>
          </Button>

          <Button variant="default" size="sm" asChild className="gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700">
            <Link to="/">
              <span>Select Another Company</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score */}
        <Card className="border-slate-200 bg-white shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{report.overall_score}</span>
              <span className="text-sm text-slate-400 font-bold">/ 100</span>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={report.overall_score} className="h-2.5" />
          </div>
        </Card>

        {/* Selection Probability */}
        <Card className="border-slate-200 bg-white shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selection Probability</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-blue-600">{report.selection_probability}%</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {getDecisionBadge(report.selection_probability)}
          </div>
        </Card>

        {/* Total Questions Evaluated */}
        <Card className="border-slate-200 bg-white shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions Answered</span>
            <div className="text-4xl font-black text-slate-800">
              {report.question_evaluations?.length || report.total_questions}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Completed in {report.duration_minutes.toFixed(1)} minutes</span>
          </div>
        </Card>
      </div>

      {/* Competency Dimensions */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Competency & Communication Dimension Breakdown</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Scores evaluated from your speech clarity, technical depth, and structured problem-solving approach.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Technical Depth */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Technical Depth & Architecture</span>
                <span className="font-bold text-slate-900">{report.technical_depth_score}%</span>
              </div>
              <Progress value={report.technical_depth_score} className="h-2" />
            </div>

            {/* Problem Solving */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Problem Solving & Reasoning</span>
                <span className="font-bold text-slate-900">{report.problem_solving_score}%</span>
              </div>
              <Progress value={report.problem_solving_score} className="h-2" />
            </div>

            {/* Communication */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Communication & Articulation</span>
                <span className="font-bold text-slate-900">{report.communication_score}%</span>
              </div>
              <Progress value={report.communication_score} className="h-2" />
            </div>

            {/* Clarity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Clarity & Conciseness</span>
                <span className="font-bold text-slate-900">{report.clarity_score}%</span>
              </div>
              <Progress value={report.clarity_score} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              <span>Key Strengths Observed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.key_strengths?.length ? (
              report.key_strengths.map((str, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{str}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No specific strengths recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Improvement Areas */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-amber-500" />
              <span>Areas for Improvement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.areas_for_improvement?.length ? (
              report.areas_for_improvement.map((area, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{area}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No major weaknesses identified.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Deep Dive */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Question-by-Question Breakdown</span>
        </h2>

        {report.question_evaluations?.map((item, idx) => (
          <Card key={idx} className="border-slate-200 bg-white shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Question {idx + 1}
                  </span>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    {item.question}
                  </CardTitle>
                </div>
                <Badge
                  variant={item.score >= 70 ? "success" : item.score >= 50 ? "warning" : "destructive"}
                  className="text-xs font-bold shrink-0"
                >
                  Score: {item.score}/100
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Candidate Voice Answer */}
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Your Answer (Transcribed)
                </span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 italic">
                  "{item.candidate_answer}"
                </p>
              </div>

              {/* Feedback */}
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Interviewer Feedback
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {item.feedback}
                </p>
              </div>

              {/* Suggested Model Answer */}
              <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-100">
                <span className="font-bold text-blue-900 uppercase tracking-wider block mb-1">
                  Suggested Model Answer
                </span>
                <p className="text-blue-950 leading-relaxed">
                  {item.suggested_answer}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InterviewReport;
