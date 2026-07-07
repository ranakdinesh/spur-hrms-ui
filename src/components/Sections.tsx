import { SignupModalButton } from "@/components/ContactForm";
import { asset, features, plans, startupItems, stats, testimonials } from "@/lib/site-data";

export function SectionIntro({
  eyebrow,
  title,
  text,
  large = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  large?: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <span className="mb-5 inline-flex rounded-full bg-[#d6eae3] px-5 py-2 text-sm font-bold text-[#588368]">{eyebrow}</span>
      <h2 className={`${large ? "text-4xl md:text-[45px]" : "text-4xl"} mb-4 font-bold leading-tight text-[#588368]`}>{title}</h2>
      <p className={`${large ? "text-lg md:text-xl" : "text-base"} mx-auto max-w-3xl leading-7 text-[#6b7280]`}>{text}</p>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="bg-[#f4fbf8] pb-28 pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-[#d6eae3] px-5 py-2 text-sm font-bold text-[#588368]">. Trusted by 50+ Businesses</div>
          <h1 className="text-[38px] font-bold leading-tight text-[#111827] md:whitespace-nowrap md:text-[40px]">Manage Your Entire Workforce</h1>
          <h2 className="mb-4 text-[38px] font-bold leading-tight text-[#588368] md:text-[40px]">With One AI-Powered HRMS</h2>
          <p className="mb-8 max-w-xl text-base leading-7 text-[#6b7280]">Simplify attendance tracking&nbsp;Automate payroll Empower employees</p>
          <SignupModalButton />
        </div>
        <img alt="Setika HRMS dashboard" className="hidden w-full object-contain lg:block" src={asset("/assets/img/inner-pages/hero-img.webp")} />
      </div>
    </section>
  );
}

export function StatsSection({ overlap = false }: { overlap?: boolean }) {
  return (
    <section className={`relative z-10 mx-auto max-w-6xl px-4 ${overlap ? "-mt-16" : "py-10"}`}>
      <div className="grid gap-6 rounded-2xl bg-white px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:grid-cols-2 lg:grid-cols-6">
        {stats.map(([value, label]) => (
          <div className="text-center" key={label}>
            <div className="mb-2 text-[34px] font-bold text-[#588368]">{value}</div>
            <p className="text-sm text-[#111827]">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20" id="features">
      <SectionIntro
        eyebrow="Why Choose Us"
        title="Powering Smart, Seamless HR for Everyone"
        text="Discover a modern HRMS built to simplify workflows, empower employees, and support growing organisations with reliable tools designed for everyday efficiency and success."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article className="rounded-lg border border-[#e5e7eb] bg-white p-6" key={feature.title}>
            <img alt={feature.title} className="mb-5 h-[60px] w-[60px] rounded-xl" src={asset(feature.image)} />
            <h3 className="mb-3 text-2xl font-semibold">{feature.title}</h3>
            <p className="mb-5 text-sm leading-6 text-[#6b7280]">{feature.body}</p>
            <ul className="space-y-2 text-sm text-[#6b7280]">
              {feature.points.map((point) => (
                <li key={point}>
                  <span className="mr-2 font-bold text-[#588368]">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="bg-[#fbfdfc] px-4 py-20" id="pricing">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          eyebrow="Flexible Plans"
          title="Find the Right Pricing Option for Your Growing Team"
          text="Simple pricing built to scale with every stage of your business. No lock-ins, upgrade anytime."
          large
        />
        <div className="my-10 flex flex-wrap items-center justify-center gap-8">
          <div className="flex gap-2">
            <button className="rounded-lg bg-[#e8f5f1] px-6 py-3 text-sm font-bold text-[#065f46]">INR (₹)</button>
            <button className="rounded-lg px-6 py-3 text-sm font-bold text-[#6b7280]">USD ($)</button>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="text-[#065f46]">Monthly</span>
            <span className="relative h-7 w-[52px] rounded-full bg-[#d1d5db]">
              <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow" />
            </span>
            <span className="text-[#6b7280]">Yearly</span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article className="flex h-full flex-col rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm" key={plan.name}>
              <img alt={plan.name} className="mb-4 h-14 w-14 rounded-xl" src={asset(plan.image)} />
              <h3 className="mb-2 text-3xl font-semibold">{plan.name}</h3>
              <p className="mb-3 text-sm text-[#6b7280]">{plan.intro}</p>
              <div className="mb-6 text-4xl font-bold text-[#6b7280]">
                {plan.price}
                <span className="text-lg font-normal">{plan.suffix}</span>
              </div>
              <p className="mb-6 min-h-12 text-sm font-semibold leading-6 text-[#4b5563]">{plan.note}</p>
              <a className="mb-8 rounded-lg bg-[#588368] px-6 py-3 text-center font-semibold text-white" href="/contact-us/">
                Start Free Trial
              </a>
              <ul className="space-y-2 text-sm text-[#5c5c5c]">
                {plan.items.map((item) => (
                  <li key={item}>
                    <span className="mr-2 font-bold text-[#588368]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#6b7280]">All plans include a 30 day free trial • No credit card required • Cancel anytime</p>
      </div>
    </section>
  );
}

export function StartupSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-[1fr_0.9fr]">
      <div>
        <span className="mb-4 inline-flex text-sm font-semibold text-[#588368]">For Startups</span>
        <h2 className="mb-4 text-4xl font-bold leading-tight text-[#588368]">Built to Streamline HR Processes for Startups</h2>
        <p className="mb-8 text-[#6b7280]">Designed for fast-growing businesses, this HRMS is intuitive, scalable, and adapts seamlessly as teams expand.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {startupItems.map(([title, text]) => (
            <div key={title}>
              <h3 className="mb-2 text-base font-bold">{title}</h3>
              <p className="text-sm leading-6 text-[#6b7280]">{text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-[#f4fbf8] p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-bold">Benefits Box</h3>
        {[["Active", "Automated Workflows"], ["20%", "Free Migration & Setup"], ["$0", "Dedicated Support"], ["15 min", "Setup Time"], ["4.9/5", "Startup Rating"]].map(([value, label]) => (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-5 py-4" key={label}>
            <span className="font-bold text-[#588368]">{value}</span>
            <span className="text-sm text-[#6b7280]">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="bg-[#f8fbfa] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionIntro eyebrow="Trusted" title="Streamlined HR Processes For Everyone" text="Businesses achieve efficiency and accuracy in employee management effortlessly with Setika." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map(([quote, image]) => (
            <article className="flex min-h-[310px] flex-col rounded-2xl bg-white p-6 shadow-sm" key={quote}>
              <div className="mb-5 text-xl text-[#fbbf24]">★★★★★</div>
              <p className="mb-8 flex-1 leading-7 text-[#6b7280]">“{quote}”</p>
              <div className="flex items-center gap-3">
                <img alt="Sarah Joshep" className="h-12 w-12 rounded-full object-cover" src={asset(image)} />
                <div>
                  <div className="font-semibold">Sarah Joshep</div>
                  <div className="text-sm text-[#9ca3af]">HR Director, Info tech Solutions</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="bg-white px-4 py-20" id="contactus">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-5 text-4xl font-bold leading-tight text-[#588368] md:text-[45px]">Revolutionize Your HR Process</h2>
          <p className="mb-8 text-[#6b7280]">Experience faster onboarding, smarter workflows, and reliable employee management with Setika.</p>
          <div className="flex flex-wrap gap-4">
            <a className="rounded-lg bg-[#588368] px-8 py-3 font-semibold text-white" href="/contact-us/">
              Get 30 Days FREE Trial
            </a>
            <a className="rounded-lg border-2 border-[#588368] bg-white px-8 py-3 font-semibold text-[#588368]" href="/contact-us/">
              Book a Demo
            </a>
          </div>
        </div>
        <img alt="Setika mobile app" className="mx-auto w-full max-w-[500px] object-contain" src={asset("/assets/img/inner-pages/blog-phone.webp")} />
      </div>
    </section>
  );
}

export function PageHero({ eyebrow, title, text }: { eyebrow?: string; title: string; text: string }) {
  return (
    <section className="bg-[#f4fbf8] px-4 py-20 text-center">
      {eyebrow ? <span className="mb-5 inline-flex rounded-full bg-[#d6eae3] px-5 py-2 text-sm font-bold text-[#588368]">{eyebrow}</span> : null}
      <h1 className="mx-auto mb-4 max-w-4xl text-4xl font-bold leading-tight text-[#588368] md:text-[45px]">{title}</h1>
      <p className="mx-auto max-w-3xl text-lg leading-8 text-[#6b7280]">{text}</p>
    </section>
  );
}
