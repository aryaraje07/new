"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Brain,
  ClipboardList,
  Activity,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LearningMemory } from "@/components/learner/LearningMemory";
import { DashboardVisualizations } from "@/components/learner/DashboardVisualizations";

export default function LearnerDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${baseUrl}/learner/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4 max-w-md p-6 bg-card border border-border rounded-lg shadow-xs">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="text-base font-semibold text-foreground">{t('common.error')}</h2>
          <p className="text-xs text-muted-foreground">Please verify network connectivity and reload the portal.</p>
          <Button onClick={() => window.location.reload()} size="sm">
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const competencies = dashboardData.competencyOverview?.competencies || [];
  const openGaps = competencies.filter((item: any) => item.gap?.status === "open");
  const assessedCount = competencies.filter((item: any) => item.current?.score != null).length;

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-4 pb-4">
      {/* PAGE HEADER */}
      <div className="border-b border-border/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {t('dashboard.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dashboardData.profile?.fullName || 'Official'} · {dashboardData.profile?.designation || 'Government Official'}
            </p>
          </div>
          <div className="w-fit rounded-md border border-border/80 bg-card px-4 py-2 sm:min-w-[180px] sm:text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {t('skillGaps.targetRole')}
            </p>
            <p className="text-xs font-semibold text-primary mt-0.5">
              {dashboardData.competencyOverview?.targetRole || t('skillGaps.notConfigured')}
            </p>
          </div>
        </div>
      </div>

      {/* PRIMARY COMPETENCY SUMMARY METRICS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0 border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-primary/10 text-primary">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('dashboard.overallReadiness')}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                {dashboardData.overallAverage || 0}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-amber-500/10 text-amber-600">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('dashboard.priorityGaps')}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                {openGaps.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-blue-500/10 text-blue-600">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('dashboard.assessed')}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                {assessedCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('dashboard.learning')}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                {dashboardData.trainingHistory?.length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* CHARTS FIRST: keep visual progress immediately below the summary metrics */}
      <DashboardVisualizations data={dashboardData.visualizationData} loading={loading} />

      {/* CORE COMPETENCY WORKSPACE */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
      <Card className="min-w-0 overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('dashboard.yourCompetencyProfile')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Measured capability versus official target requirements
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/learner/skill-gaps')}
            className="text-xs h-8"
          >
            {t('skillGaps.viewDetails')}
          </Button>
        </div>
        <div className="max-h-[min(54vh,560px)] overflow-y-auto scrollbar-hide p-4">
          {competencies.length ? (
            <div className="space-y-3">
              {competencies.map((item: any) => {
                const currentScore = item.current?.score || 0;
                const requiredScore = item.requiredLevel * 25;
                const gap = requiredScore - currentScore;
                const isGap = gap > 0;

                return (
                  <div key={item.competency._id || item.competency.code} className="border border-border rounded-md p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 pr-4">
                        <p className="text-xs font-semibold text-foreground">{item.competency.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t('skillGaps.required')}: Level {item.requiredLevel} ({requiredScore}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">
                          {currentScore}%
                        </p>
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium border mt-0.5 ${item.current?.score == null
                            ? "bg-secondary text-muted-foreground border-border"
                            : isGap
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}>
                          {item.current?.score == null ? t('skillGaps.notAssessed') : isGap ? t('skillGaps.gap') : t('skillGaps.ready')}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(currentScore, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs text-muted-foreground">{t('skillGaps.willAppear')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* PRIORITY SKILL GAPS */}
      <Card className="min-w-0 overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('dashboard.prioritySkillGaps')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Target competencies requiring immediate training focus</p>
        </div>
        <div className="max-h-[min(54vh,560px)] overflow-y-auto scrollbar-hide p-4">
          {openGaps.length > 0 ? (
            <div className="space-y-2.5">
              {openGaps.slice(0, 5).map((item: any) => {
                const currentScore = item.current?.score || 0;
                const requiredScore = item.requiredLevel * 25;
                const gap = requiredScore - currentScore;

                return (
                  <div key={item.competency._id || item.competency.code} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-md gap-3 bg-card">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">{item.competency.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{t('skillGaps.current')}: {currentScore}%</span>
                        <span>{t('skillGaps.required')}: {requiredScore}%</span>
                        <span className="text-red-700 font-semibold">{t('skillGaps.gap')}: {gap}%</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-8 shrink-0 self-start sm:self-auto" onClick={() => router.push("/learner/skill-gaps")}>
                      {t('skillGaps.addressGap')}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs text-muted-foreground">{t('dashboard.noGaps')}</p>
            </div>
          )}
        </div>
      </Card>
      </div>

      {/* RECOMMENDED NEXT STEP */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card className="min-w-0 overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('dashboard.recommendedNextStep')}</h2>
        </div>
        <div className="p-4">
          {dashboardData.recommendations?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recommendations.slice(0, 2).map((item: any) => (
                <div key={item._id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 border border-border rounded-md bg-card">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.sourceType === "igot" ? "iGOT Karmayogi" : item.sourceType || "Official Resource"} · {item.status}
                    </p>
                  </div>
                  <Button size="sm" className="text-xs h-8 shrink-0 self-start sm:self-auto" onClick={() => router.push("/learner/courses")}>
                    {t('common.continue')}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs text-muted-foreground">{t('dashboard.noRecommendations')}</p>
              <Button size="sm" className="mt-3 text-xs h-8" onClick={() => router.push("/learner/quiz")}>
                {t('dashboard.startDiagnostic')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ASSESSMENT HISTORY */}
      <Card className="min-w-0 overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('dashboard.assessmentHistory')}</h2>
        </div>
        <div className="p-4">
          {(dashboardData.recentActivity || []).length > 0 ? (
            <div className="space-y-2">
              {dashboardData.recentActivity.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.subject}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground bg-secondary px-2.5 py-1 rounded border border-border">
                    {item.score || 0}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-foreground">{t('dashboard.noHistory')}</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">{t('dashboard.completeDiagnostic')}</p>
              <Button size="sm" className="mt-3 text-xs h-8" onClick={() => router.push("/learner/quiz")}>
                {t('dashboard.takeDiagnostic')}
              </Button>
            </div>
          )}
        </div>
      </Card>
      </div>

      {/* ASSIGNED ASSESSMENTS */}
      {dashboardData.scheduledAssessments?.length ? (
        <Card className="border border-border shadow-xs">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">{t('dashboard.assignedAssessments')}</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {dashboardData.scheduledAssessments.slice(0, 3).map((assessment: any) => (
                <div key={assessment._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{assessment.title}</p>
                    <p className="text-[11px] text-muted-foreground">{assessment.subject}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => router.push(`/learner/quiz/take/${assessment._id}`)}>
                    {t('courses.takeAssessment')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {/* LEARNING MEMORY */}
      <LearningMemory memories={dashboardData.learningMemory} loading={loading} />
    </div>
  );
}
