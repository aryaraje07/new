import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sparkles, Users, Zap, Award } from 'lucide-react'

export default function AboutPage() {
  const team = [
    { name: 'Sarah Chen', role: 'Founder & CEO', bio: 'EdTech visionary with 10+ years of experience' },
    { name: 'Michael Torres', role: 'CTO', bio: 'AI & machine learning expert' },
    { name: 'Emily Roberts', role: 'Head of Education', bio: 'Curriculum design specialist' },
    { name: 'David Kim', role: 'Lead Product Manager', bio: 'User experience innovator' },
  ]

  const values = [
    {
      icon: Sparkles,
      title: 'Innovation',
      description: 'We continuously push the boundaries of what AI can do in education',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'We build for students, teachers, and parents as a unified ecosystem',
    },
    {
      icon: Zap,
      title: 'Excellence',
      description: 'We strive for the highest quality in every aspect of our platform',
    },
    {
      icon: Award,
      title: 'Accessibility',
      description: 'Quality education should be available to everyone, everywhere',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span>SkillifyAI</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost">Contact</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">About SkillifyAI</h1>
          <p className="text-xl text-muted-foreground">
            Transforming education through intelligent technology and human-centered design
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
              <p className="text-lg text-muted-foreground">
                At SkillifyAI, we believe that quality education should be personalized, intelligent, and accessible to everyone. We're building the next generation of learning platforms that combine the power of artificial intelligence with human expertise to create transformative educational experiences.
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-8 flex items-center justify-center min-h-64">
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-foreground font-semibold">AI-Powered Learning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">What drives everything we do</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, idx) => {
              const IconComponent = value.icon
              return (
                <Card key={idx} className="p-6 border border-border">
                  <IconComponent className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Team</h2>
            <p className="text-lg text-muted-foreground">Passionate professionals dedicated to transforming education</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, idx) => (
              <Card key={idx} className="p-6 border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-primary mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Join the SkillifyAI Community</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Be part of the future of personalized learning
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/role-select">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
