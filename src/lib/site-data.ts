export const asset = (path: string) => `https://www.setika.one${path}`;

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "About Us", href: "/about-us/" },
  { label: "Contact us", href: "/contact-us/" },
];

export const stats = [
  ["50+", "Businesses Onboarded"],
  ["3,000+", "Active Employees"],
  ["98.5%", "Feature Adoption Rate"],
  ["4.7/5", "User Satisfaction Score"],
  ["10+", "Cities Supported"],
  [">1Hour", "Average Setup Time"],
] as const;

export const features = [
  {
    title: "Smart Automation",
    image: "/assets/img/inner-pages/Smart Automation.webp",
    body: "Automate daily HR tasks with intelligent workflows that cut manual work, reduce errors, and help teams focus on more meaningful, productive responsibilities.",
    points: ["Faster approvals", "Reduced errors", "Smooth workflows"],
  },
  {
    title: "Secure Data",
    image: "/assets/img/inner-pages/innovation-driven.webp",
    body: "Protect sensitive employee information with enterprise-grade encryption, safe access controls, and strict compliance standards to ensure organisational data stays private, secure, and trustworthy.",
    points: ["Encrypted storage", "Role-based access", "Compliance ready"],
  },
  {
    title: "People Centric",
    image: "/assets/img/inner-pages/people-centric.webp",
    body: "Simplify new hire journeys with guided onboarding tools that help employees settle quickly, access documents easily, and stay connected from day one.",
    points: ["Quick setup", "Paperless joining", "Employee guides"],
  },
  {
    title: "Real-Time Insights",
    image: "/assets/img/inner-pages/scalability.webp",
    body: "Make informed decisions with real-time dashboards and accurate reports that reveal attendance, performance, and productivity trends to support smarter workforce planning.",
    points: ["Instant dashboards", "Accurate reports", "Data-driven clarity"],
  },
  {
    title: "Mobile Convenience",
    image: "/assets/img/inner-pages/integration-ready.webp",
    body: "Empower teams with a mobile-first HRMS that lets them manage attendance, leave, documents, and updates anytime for smoother, on-the-go self-service.",
    points: ["Easy access", "On-the-go use", "Employee friendly"],
  },
  {
    title: "Reliable Support",
    image: "/assets/img/inner-pages/data-driven-insights.webp",
    body: "Receive dependable assistance with quick responses, smooth onboarding guidance, and continuous support to ensure your organisation always maximises the value of Setika HRMS.",
    points: ["Quick help", "Expert guidance", "Ongoing support"],
  },
];

export const plans = [
  {
    name: "Starter",
    image: "/assets/img/inner-pages/starter.webp",
    intro: "For small teams starting with structured HR",
    price: "₹999",
    suffix: "/month",
    note: "Includes ₹39 per employee billing, capped at 50 employees.",
    items: ["₹39 per employee", "₹999 minimum monthly bill", "Up to 50 employees", "Core HR management", "Employee database", "Leave management", "Time Tracking", "Mobile app access", "Email support", "Basic reporting"],
  },
  {
    name: "Growth 100",
    image: "/assets/img/inner-pages/professional.webp",
    intro: "For growing companies with predictable HRMS spend",
    price: "₹5,000",
    suffix: "/month",
    note: "Includes 100 employees, then ₹45 per extra employee up to 150.",
    items: ["100 employees included", "₹45 per extra employee", "Up to 150 employees", "Full HR suite", "Advanced employee records", "Smart leave workflows", "Payroll", "Onboarding Employee", "F&F Employee", "Enhanced reporting"],
  },
  {
    name: "Business 250",
    image: "/assets/img/inner-pages/custom.webp",
    intro: "For established teams needing broader capacity",
    price: "₹11,000",
    suffix: "/month",
    note: "Includes 250 employees, then ₹40 per extra employee up to 350.",
    items: ["250 employees included", "₹40 per extra employee", "Up to 350 employees", "Payroll and statutory workflows", "Onboarding and exits", "Custom company settings", "Priority support", "Enhanced reports"],
  },
  {
    name: "Enterprise 500",
    image: "/assets/img/inner-pages/custom.webp",
    intro: "For large teams and annual commercial commitments",
    price: "₹20,000",
    suffix: "/month",
    note: "Includes 500 employees, then ₹35 per extra employee up to 750.",
    items: ["500 employees included", "₹35 per extra employee", "Up to 750 employees", "Advanced configuration", "Priority onboarding", "Provider settings", "Storage and notification controls", "Enterprise support"],
  },
];

export const startupItems = [
  ["Fast Onboarding", "Launch the HR platform in under 15 minutes. No technical setup required."],
  ["Flexible Startup Pricing", "Affordable plans tailored for early-stage companies. Pay only for what's used, monthly or annually."],
  ["Grow Without Limits", "Scale effortlessly from a few employees to 500+. Infrastructure expands as the team grows."],
  ["Learning & Templates", "Ready-made HR templates, guides, and best practices to strengthen HR from day one."],
  ["Community & Support", "Engage with founders and HR leaders, gain expert insights, and receive continuous support."],
] as const;

export const testimonials = [
  ["Setika transformed our HR operations, saving time and reducing errors significantly.", "/assets/img/inner-pages/avatar-1.jpg"],
  ["The platform is intuitive and reliable, making payroll and attendance seamless.", "/assets/img/inner-pages/avatar-2.jpg"],
  ["HR management has never been this organized and stress-free with Setika.", "/assets/img/inner-pages/avatar-3.jpg"],
] as const;
