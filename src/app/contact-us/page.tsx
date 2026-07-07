import { ContactForm } from "@/components/ContactForm";
import { PageShell } from "@/components/SiteChrome";

export default function ContactPage() {
  return (
    <PageShell>
      <section className="bg-[#f4fbf8] px-4 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="mb-4 text-5xl font-bold text-[#588368]">Get in touch</h1>
            <p className="mb-10 text-lg leading-8 text-[#6b7280]">Have questions about Setika? Want a custom demo? We&apos;re here to help.</p>
            <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <h3 className="mb-6 text-2xl font-bold">Contact Information</h3>
              <Info title="Sales & Support" value="hello@citual.in" href="mailto:hello@citual.in" />
              <Info title="Phone" value="+91 630 991 9355" href="tel:+916309919355" />
              <div>
                <h4 className="mb-2 font-bold">Headquarters</h4>
                <p className="leading-7 text-[#6b7280]">
                  304, 3rd Floor, Park Centra, Sector 30
                  <br />
                  Gurugram, Haryana 122001
                  <br />
                  India
                </p>
              </div>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </PageShell>
  );
}

function Info({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <div className="mb-6">
      <h4 className="mb-2 font-bold">{title}</h4>
      <a className="text-[#588368]" href={href}>
        {value}
      </a>
    </div>
  );
}
