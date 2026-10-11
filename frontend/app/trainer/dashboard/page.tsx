'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Users, FileText, TrendingUp, Award, BookOpen, Activity, Target } from 'lucide-react'

export default function FacultyDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    totalExams: 0,
    avgPassRate: 0,
    recentExams: [] as any[],
    subjectPerformance: [] as any[],
    learnerProgress: [] as any[],
  })

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  /* ================= FETCH DASHBOARD ================= */
  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    const fetchDashboardData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trainer/dashboard`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!res.ok) throw new Error('Failed to fetch dashboard')

        const data = await res.json()

        setDashboardData({
          totalStudents: data.totalStudents || 0,
          totalExams: data.totalExams || 0,
          avgPassRate: data.avgPassRate || 0,
          recentExams: data.recentExams || [],
          subjectPerformance: data.subjectPerformance || [],
          learnerProgress: data.learnerProgress || [],
        })
      } catch (err) {
        console.error('Dashboard fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [token, router])

  /* ================= KPI CARD ================= */
  function KpiCard({ icon, label, value, color }: any) {
    return (
      <Card className="p-6 glass-morphism hover-lift group">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Award className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Training Officer Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage assessments, training material, and learner progress</p>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            icon={<Users className="w-5 h-5 text-white" />}
            label="Total Learners"
            value={dashboardData.totalStudents}
            color="from-blue-500 to-blue-600"
          />
          <KpiCard
            icon={<FileText className="w-5 h-5 text-white" />}
            label="Exams Created"
            value={dashboardData.totalExams}
            color="from-green-500 to-green-600"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            label="Avg Pass Rate"
            value={`${dashboardData.avgPassRate}%`}
            color="from-purple-500 to-purple-600"
          />
        </div>

        <Card className="p-6 glass-morphism hover-lift">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-foreground">Authorized Learner Progress</h2>
          </div>
          {dashboardData.learnerProgress.length === 0 ? (
            <p className="text-muted-foreground">No authorized learners yet.</p>
          ) : (
            <div className="space-y-3">
              {dashboardData.learnerProgress.slice(0, 8).map((learner: any) => (
                <div key={learner._id} className="flex items-center justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <p className="font-medium text-foreground">{learner.fullName}</p>
                    <p className="text-xs text-muted-foreground">{learner.designation || ""} {learner.targetRole ? `| ${learner.targetRole}` : ""}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{learner.readiness}</p>
                    <p className="text-xs text-muted-foreground">{learner.latestScore == null ? "No score" : `${learner.latestScore}%`} | {learner.openGaps} gaps</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* MAIN SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RECENT EXAMS */}
          <Card className="p-6 glass-morphism hover-lift">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-foreground">Recent Exams</h2>
            </div>

            {dashboardData.recentExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No exams created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentExams.slice(0, 5).map((exam, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors duration-200"
                  >
                    <div>
                      <p className="font-medium text-foreground">{exam.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {exam.studentsCount} students
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        exam.status === 'completed'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {exam.status === 'completed' ? 'Completed' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* PERFORMANCE METRICS */}
          <Card className="p-6 glass-morphism hover-lift">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
            </div>

            {dashboardData.subjectPerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No performance data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* PIE CHART */}
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.subjectPerformance}
                        dataKey="avgScore"
                        nameKey="subject"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={4}
                        label={({ subject, avgScore }) =>
                          `${subject} (${avgScore}%)`
                        }
                      >
                        {dashboardData.subjectPerformance.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* PERFORMANCE STATS */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Best Subject</p>
                        <p className="text-xl font-bold text-blue-800">
                          {dashboardData.subjectPerformance.reduce((best, current) => 
                            current.avgScore > best.avgScore ? current : best
                          ).subject}
                        </p>
                      </div>
                      <div className="text-3xl">🏆</div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Pass Rate</p>
                        <p className="text-xl font-bold text-green-800">
                          {Math.round(
                            dashboardData.subjectPerformance.filter(s => s.avgScore >= 40).length / 
                            dashboardData.subjectPerformance.length * 100
                          )}%
                        </p>
                      </div>
                      <div className="text-3xl">✅</div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Avg Score</p>
                        <p className="text-xl font-bold text-purple-800">
                          {Math.round(
                            dashboardData.subjectPerformance.reduce((sum, s) => sum + s.avgScore, 0) / 
                            dashboardData.subjectPerformance.length
                          )}%
                        </p>
                      </div>
                      <div className="text-3xl">📊</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Button
            onClick={() => router.push('/trainer/create-exam')}
            variant="gradient"
            size="lg"
            className="shadow-lg hover:shadow-xl group h-12"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create New Exam
            <Target className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>

          <Button
            onClick={() => router.push('/trainer/material-upload')}
            variant="outline"
            size="lg"
            className="border-2 hover:bg-accent/50 group h-12"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Upload Materials
            <Target className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>

          <Button
            onClick={() => router.push('/trainer/view-students')}
            variant="outline"
            size="lg"
            className="border-2 hover:bg-accent/50 group h-12"
          >
            <Users className="w-4 h-4 mr-2" />
            View All Students
            <Target className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </div>
  )
}