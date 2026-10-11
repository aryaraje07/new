'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Mail, Phone, MapPin, Send } from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.subject && formData.message) {
      setSubmitted(true)
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' })
        setSubmitted(false)
      }, 3000)
    }
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'support@skillifyai.com',
      description: 'We respond within 24 hours'
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '+1 (555) 123-4567',
      description: 'Monday - Friday, 9AM-6PM EST'
    },
    {
      icon: MapPin,
      title: 'Location',
      content: 'San Francisco, CA',
      description: 'Headquarters & Innovation Hub'
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
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">Get in Touch</h1>
          <p className="text-xl text-muted-foreground">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-16">
          {contactInfo.map((info, idx) => {
            const IconComponent = info.icon
            return (
              <Card key={idx} className="p-6 border border-border text-center">
                <IconComponent className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{info.title}</h3>
                <p className="font-medium text-foreground mb-1">{info.content}</p>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>
            
            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Message Sent Successfully</h3>
                <p className="text-muted-foreground">Thank you for reaching out! We'll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Your Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-10 border-border bg-background"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-10 border-border bg-background"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="h-10 border-border bg-background"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">
                    Message
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full p-3 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 gap-2 h-10"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-2">What is SkillifyAI?</h3>
              <p className="text-muted-foreground">
                SkillifyAI is an AI-powered educational platform designed for students, teachers, and parents to create personalized learning experiences through intelligent quizzes, practice sessions, and comprehensive analytics.
              </p>
            </Card>

            <Card className="p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-2">How do I get started?</h3>
              <p className="text-muted-foreground">
                Simply sign up on our platform, select your role (student, faculty, or parent), and you'll gain immediate access to all features. No credit card required for the trial period.
              </p>
            </Card>

            <Card className="p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Is my data secure?</h3>
              <p className="text-muted-foreground">
                Yes, we take data security seriously. All user information is encrypted and stored securely on our servers. We comply with all major data protection regulations.
              </p>
            </Card>

            <Card className="p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Do you offer customer support?</h3>
              <p className="text-muted-foreground">
                Absolutely! Our support team is available Monday through Friday from 9AM to 6PM EST. You can reach us via email or phone using the contact information provided above.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
