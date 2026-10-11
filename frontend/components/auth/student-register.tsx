"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { FaceRegistrationModal } from "./face-registration-modal";
import { registerUser } from "@/lib/auth";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function StudentRegister() {
  const router = useRouter();
  const { currentPlan } = useSubscription();
  const [step, setStep] = useState<"form" | "face">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [currentAssignment, setCurrentAssignment] = useState("");
  const [qualification, setQualification] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [previousTraining, setPreviousTraining] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await registerUser({
        fullName,
        email,
        phone,
        password,
        role: "learner",
        designation,
        department,
        organization,
        jobRole,
        currentAssignment,
        qualification,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
        previousTraining: previousTraining
          .split(",")
          .map((training) => training.trim())
          .filter(Boolean),
        targetRole,
      });

      // ✅ VERY IMPORTANT
      localStorage.setItem("token", data.token);

      // move to face verification
      setStep("face");
    } catch (error: any) {
      alert(error.response?.data?.message || "Registration failed");
    }
  };

  const handleFaceVerified = async () => {
    setFaceVerified(true);
    try {
      const diagnostic = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/diagnostics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ questionCount: 10 }),
      });
      const data = await diagnostic.json();
      if (!diagnostic.ok) throw new Error(data.message || "Initial diagnostic generation failed");
      router.push(`/learner/quiz/take/${data.examId}`);
    } catch (error: any) {
      alert(error.message || "Initial diagnostic generation failed. You can retry it from your profile.");
      router.push("/learner/profile");
    }
  };

  if (step === "face") {
    return <FaceRegistrationModal onVerified={handleFaceVerified} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-bold text-2xl"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-foreground">SkillifyAI</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Create Learner Account
          </h1>
          <p className="text-muted-foreground">
            Build your official competency profile with SkillifyAI
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-primary">
              Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </span>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="p-8 border border-border shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-foreground"
              >
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 border-border bg-background"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-border bg-background"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-10 border-border bg-background"
              />
            </div>

            {/* Workforce Profile */}
            {[
              ["designation", "Designation", designation, setDesignation],
              ["department", "Department", department, setDepartment],
              ["organization", "Organization", organization, setOrganization],
              ["jobRole", "Job Role", jobRole, setJobRole],
              ["currentAssignment", "Current Assignment", currentAssignment, setCurrentAssignment],
              ["qualification", "Qualification", qualification, setQualification],
            ].map(([id, label, value, setter]) => (
              <div className="space-y-2" key={id as string}>
                <Label htmlFor={id as string} className="text-sm font-medium text-foreground">
                  {label as string}
                </Label>
                <Input
                  id={id as string}
                  type="text"
                  value={value as string}
                  onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  required
                  className="h-10 border-border bg-background"
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="targetRole" className="text-sm font-medium text-foreground">Prototype designation</Label>
              <select id="targetRole" value={targetRole} onChange={(e) => { setTargetRole(e.target.value); setDesignation(e.target.value); }} required className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="">Select your designation</option>
                <option>Statistical Officer</option>
                <option>Statistical Analyst</option>
                <option>Survey / Field Statistics Officer</option>
                <option>Statistical Programmer / Data Systems Officer</option>
              </select>
              <p className="text-xs text-muted-foreground">Representative prototype competency mappings aligned with FRAC principles.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience" className="text-sm font-medium text-foreground">
                Years of Experience
              </Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                required
                className="h-10 border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousTraining" className="text-sm font-medium text-foreground">
                Previous Training
              </Label>
              <Input
                id="previousTraining"
                type="text"
                placeholder="Separate multiple entries with commas"
                value={previousTraining}
                onChange={(e) => setPreviousTraining(e.target.value)}
                className="h-10 border-border bg-background"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 border-border bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="text-xs text-red-500">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 border-border bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-primary hover:bg-primary/90 mt-6"
              disabled={
                !fullName ||
                !email ||
                !phone ||
                !designation ||
                !department ||
                !organization ||
                !jobRole ||
                !currentAssignment ||
                !qualification ||
                !yearsOfExperience ||
                !targetRole ||
                password.length < 6 ||
                password !== confirmPassword
              }
            >
              Continue to Face Verification
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </Card>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
