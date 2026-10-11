"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LearnerProfile() {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [competencyOverview, setCompetencyOverview] = useState<any>(null);
  const [creatingDiagnostic, setCreatingDiagnostic] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState('');
  const router = useRouter();

  const startDiagnostic = async () => {
    setCreatingDiagnostic(true);
    try {
      const response = await API.post("/ai/diagnostics", { questionCount: 10 });
      router.push(`/learner/quiz/take/${response.data.examId}`);
    } catch (error: any) {
      setDiagnosticMessage(error.response?.data?.message || "The local diagnostic provider is unavailable. Retry when it is ready.");
    } finally { setCreatingDiagnostic(false); }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [res, overviewRes] = await Promise.all([
        API.get("/auth/profile"),
        API.get("/learner/competencies/overview"),
      ]);
      setFormData(res.data);
      setCompetencyOverview(overviewRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      await API.put("/auth/profile", formData);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    fetchProfile();
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!formData) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {t('profile.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('profile.subtitle')}
        </p>
      </div>

      <Card className="border border-border bg-card shadow-xs">
        <div className="p-4 space-y-6">
          {/* Top Section - Official Profile */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-md bg-primary flex items-center justify-center shadow-xs">
                <span className="text-lg font-bold text-primary-foreground">
                  {formData.fullName?.slice(0, 2).toUpperCase() || 'SO'}
                </span>
              </div>

              <div className="space-y-1">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('profile.officialId')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formData.officialId || formData.studentId || "N/A"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="text-xs font-medium text-foreground">{t('profile.active')}</span>
                </div>
              </div>
            </div>

            {/* Right: Edit Button */}
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {t('profile.editInformation')}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {t('profile.personalInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('profile.fullName')}
                </Label>
                {!isEditing ? (
                  <p className="text-foreground font-medium text-xs py-1">
                    {formData.fullName}
                  </p>
                ) : (
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    className="h-8 text-xs border-border"
                  />
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('profile.emailAddress')}
                </Label>
                {!isEditing ? (
                  <p className="text-foreground font-medium text-xs py-1">
                    {formData.email}
                  </p>
                ) : (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-8 text-xs border-border"
                  />
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('profile.phoneNumber')}
                </Label>
                {!isEditing ? (
                  <p className="text-foreground font-medium text-xs py-1">
                    {formData.phone || t('profile.notSpecified')}
                  </p>
                ) : (
                  <Input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="h-8 text-xs border-border"
                  />
                )}
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('profile.designation')}
                </Label>
                {!isEditing ? (
                  <p className="text-foreground font-medium text-xs py-1">
                    {formData.designation || t('profile.notSpecified')}
                  </p>
                ) : (
                  <Input
                    type="text"
                    value={formData.designation || ""}
                    onChange={(e) => handleChange("designation", e.target.value)}
                    className="h-8 text-xs border-border"
                  />
                )}
              </div>
            </div>

            {/* Edit Buttons */}
            {isEditing && (
              <div className="flex gap-2.5 mt-4 pt-4 border-t border-border">
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="text-xs h-8"
                >
                  {t('profile.saveChanges')}
                </Button>

                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                >
                  {t('profile.cancel')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="border border-border bg-card shadow-xs">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('profile.competencyBaseline')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('profile.targetRole')}: <strong className="text-foreground">{competencyOverview?.targetRole || formData.targetRole || t('profile.notSpecified')}</strong>
            </p>
          </div>
          <div className="rounded-md border border-border bg-secondary/50 p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground leading-relaxed">{t('profile.completeDiagnostic')}</p>
            <Button onClick={startDiagnostic} disabled={creatingDiagnostic} size="sm" variant="outline" className="text-xs h-8 shrink-0">
              {creatingDiagnostic ? t('profile.preparing') : t('profile.startDiagnostic')}
            </Button>
          </div>
          {diagnosticMessage && <p className="text-xs text-red-700">{diagnosticMessage}</p>}
          {!competencyOverview?.competencies?.length ? (
            <p className="text-xs text-muted-foreground">{t('profile.noMapping')}</p>
          ) : (
            <div className="space-y-2">
              {competencyOverview.competencies.map((item: any) => (
                <div key={item.competency._id || item.competency.code} className="border border-border rounded-md p-3 bg-card">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs font-semibold text-foreground">{item.competency.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.current?.score == null ? t('skillGaps.notAssessed') : `${item.current.score}%`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t('profile.requiredLevel')}: {item.requiredLevel} | {t('profile.gap')}: {item.gap?.gap ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
