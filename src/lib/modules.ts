import { UserRound, Globe, GraduationCap, BookOpen, FlaskConical, FileText, ClipboardList, Award, Brain, Map, Sparkles, Compass, BookMarked, Users, Trophy } from "lucide-react";

export const atlasModules = [
  { n: 1, slug: "profile", to: "/profile", title: "Student Profile & Goals", desc: "Academics, experience, tests, and study goals.", icon: UserRound },
  { n: 2, slug: "universities", to: "/programs", title: "Global University & Program Hub", desc: "Individual programs, official sources, and comparisons.", icon: Globe },
  { n: 3, slug: "undergrad", to: "/undergrad", title: "Undergraduate Admission Hub", desc: "Qualifications, activities, essays, and undergraduate preparation.", icon: GraduationCap },
  { n: 4, slug: "masters", to: "/masters", title: "Master's Admission Hub", desc: "Pathways, prerequisites, funding, and application preparation.", icon: BookOpen },
  { n: 5, slug: "phd", to: "/phd", title: "PhD & Research Career Hub", desc: "Research proposals, supervisors, fellowships, and interviews.", icon: FlaskConical },
  { n: 6, slug: "sop", to: "/sop", title: "SOP & Essays", desc: "Your statements, personal stories, and essay drafts.", icon: FileText },
  { n: 7, slug: "cv", to: "/cv", title: "CV & Resume Builder", desc: "Academic and professional experience in your own words.", icon: ClipboardList },
  { n: 8, slug: "scholarships", to: "/scholarships", title: "Scholarships & Funding", desc: "Funding opportunities, eligibility, and application links.", icon: Award },
  { n: 9, slug: "research", to: "/research", title: "Research, Innovation & Publication", desc: "Research opportunities, manuscripts, journals, and grants.", icon: Brain },
  { n: 10, slug: "documents", to: "/documents", title: "Document Center", desc: "Your private transcripts, certificates, and application documents.", icon: FileText },
  { n: 11, slug: "applications", to: "/applications", title: "Application Tracker & Control", desc: "Applications, checklists, communications, and offers.", icon: ClipboardList },
  { n: 12, slug: "roadmap", to: "/roadmap", title: "Roadmap & Task Planner", desc: "Priorities, preparation plans, and academic tasks.", icon: Map },
  { n: 13, slug: "intelligence", to: "/intelligence", title: "Shared AI Intelligence", desc: "Access the connected guidance tools across Atlas.", icon: Sparkles },
] as const;

export const supportingTools = [
  { to: "/path", title: "Path Selection", icon: Compass },
  { to: "/universities", title: "University Explorer", icon: Globe },
  { to: "/publications", title: "Publication Tracker", icon: BookMarked },
  { to: "/recommendations", title: "Recommendation Letters", icon: Users },
  { to: "/eca", title: "Activities & Achievements", icon: Trophy },
  { to: "/tests", title: "Test Preparation", icon: ClipboardList },
] as const;