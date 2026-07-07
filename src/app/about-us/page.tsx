import { CTASection, PageHero, StatsSection } from "@/components/Sections";
import { PageShell } from "@/components/SiteChrome";
import { asset } from "@/lib/site-data";

export default function AboutPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="About Us"
        title="Empowering HR Teams Worldwide"
        text="We're on a mission to transform HR management with innovative solutions that help businesses grow and employees thrive."
      />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
        <div>
          <h2 className="mb-5 text-4xl font-bold text-[#588368]">Our Story</h2>
          <p className="mb-5 leading-7 text-[#6b7280]">
            Founded with a vision to simplify HR management, SETIKA HRMS has grown into a trusted partner for businesses of all sizes. We understand the challenges HR teams face daily, and we&apos;ve built a platform that makes work easier.
          </p>
          <p className="mb-5 leading-7 text-[#6b7280]">
            Our journey began when we recognized that traditional HR systems were too complex, expensive, and inflexible. We set out to create a solution that would be powerful yet easy to use.
          </p>
          <p className="leading-7 text-[#6b7280]">
            Today, we serve thousands of companies worldwide, helping them streamline their HR processes, engage their employees, and make data-driven decisions.
          </p>
        </div>
        <img alt="SETIKA Mobile App" className="mx-auto w-full max-w-[500px] object-contain" src={asset("/assets/img/inner-pages/blog-phone.webp")} />
      </section>
      <StatsSection />
      <section className="bg-[#f4fbf8] px-4 py-16 text-center">
        <h2 className="mb-4 text-4xl font-bold text-[#588368]">Ready to Transform Your HR?</h2>
        <p className="mb-8 text-[#6b7280]">Join thousands of companies that trust SETIKA HRMS to manage their workforce effectively.</p>
        <a className="rounded-lg bg-[#588368] px-8 py-3 font-semibold text-white" href="/contact-us/">
          Get Started Today
        </a>
      </section>
      <CTASection />
    </PageShell>
  );
}
