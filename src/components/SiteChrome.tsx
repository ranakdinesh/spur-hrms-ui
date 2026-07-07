"use client";

import Link from "next/link";
import { useState } from "react";
import { useTenantBranding } from "@/lib/tenant-branding";
import { asset, navItems } from "@/lib/site-data";

export function Header() {
	const [open, setOpen] = useState(false);
	const { branding } = useTenantBranding();
	const logoSrc = branding.logo_path || asset("/assets/img/logo.png");

	return (
		<header className="sticky top-0 z-50 bg-white py-3 shadow-sm">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-4">
				<Link href="/" aria-label="Setika home">
					<img alt="Setika logo" className="h-[30px] max-w-[160px] object-contain" src={logoSrc} />
				</Link>
        <nav className="hidden items-center gap-8 text-sm font-medium xl:flex">
          {navItems.map((item) => (
					<a className="text-[#111827] hover:text-[var(--brand-primary)]" href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
					<a className="rounded border border-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--brand-primary)]" href="/reviews/">
						Demo Video
					</a>
					<a className="rounded bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white" href="/contact-us/">
						Request Demo
					</a>
				</div>
        <button
          aria-expanded={open}
          aria-label="Open menu"
					className="flex h-10 w-10 items-center justify-center rounded border border-[var(--brand-primary)] text-2xl font-bold leading-none text-[var(--brand-primary)] xl:hidden"
					onClick={() => setOpen((value) => !value)}
					type="button"
        >
          {open ? "×" : "☰"}
        </button>
      </div>
      {open ? (
        <div className="mx-auto mt-3 max-w-6xl px-4 xl:hidden">
          <nav className="rounded-xl border border-[#d6eae3] bg-white p-3 shadow-lg">
            {navItems.map((item) => (
              <a
								className="block rounded-lg px-4 py-3 text-sm font-semibold text-[#111827] hover:bg-[#eef4f1] hover:text-[var(--brand-primary)]"
                href={item.href}
                key={item.label}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid gap-2 border-t border-[#e5e7eb] pt-3 sm:hidden">
							<a className="rounded border border-[#588368] px-4 py-2 text-center text-sm font-semibold text-[var(--brand-primary)]" href="/reviews/" onClick={() => setOpen(false)}>
								Demo Video
							</a>
							<a className="rounded bg-[var(--brand-primary)] px-4 py-2 text-center text-sm font-semibold text-white" href="/contact-us/" onClick={() => setOpen(false)}>
								Request Demo
							</a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function Footer() {
	const { branding } = useTenantBranding();
	const logoSrc = branding.logo_path || asset("/assets/img/logo.png");
	const groups: Array<[string, Array<{ label: string; href: string }>]> = [
    ["Useful Pages", [{ label: "Features", href: "/features/" }, { label: "Pricing", href: "/pricing/" }, { label: "Contact", href: "/contact-us/" }]],
    ["Company", [{ label: "About", href: "/about-us/" }, { label: "Testimonials", href: "/reviews/" }, { label: "Register", href: "/contact-us/" }]],
    ["Quick Links", [{ label: "Services", href: "/features/" }, { label: "Enquiry", href: "/contact-us/" }]],
    ["Modules", [{ label: "Video Demo", href: "/reviews/" }, { label: "Features", href: "/features/" }]],
  ];

	return (
		<footer className="bg-[var(--brand-primary)] px-4 pt-16 text-white">
			<div className="mx-auto max-w-6xl">
				<div className="grid gap-10 pb-10 md:grid-cols-[1.2fr_2fr]">
					<div>
						<img alt="Setika logo" className="mb-4 h-auto max-h-16 w-[200px] object-contain" src={logoSrc} />
            <p className="mb-6 max-w-md text-sm leading-7 text-white">
              Prepare your HR department for the future with our adaptable HRMS, designed to meet the needs of a dynamic workplace and foster a culture of continuous improvement.
            </p>
            <div className="flex gap-2">
              {[
                ["in", "https://www.linkedin.com/company/citualtech"],
                ["ig", "https://www.instagram.com/citual.in/"],
                ["fb", "https://www.facebook.com/citual.in/"],
                ["yt", "https://www.youtube.com/@CITUAL"],
              ].map(([label, href]) => (
                <a className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--brand-primary)]" href={href} key={label} target="_blank">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map(([title, items]) => (
              <div key={title}>
                <h3 className="mb-4 font-semibold">{title}</h3>
                <ul className="space-y-3 text-sm text-[#d1d5db]">
                  {items.map((item) => (
                    <li key={item.label}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5 text-sm">
          <p>Copyright @ 2026 Citual. All Rights Reserved</p>
          <div className="flex flex-wrap gap-5">
            <a href="#">Refund Policy</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function FloatingActions() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-lg font-bold text-white shadow-lg" href="https://wa.me/919873915391" target="_blank">
        W
      </a>
      <a className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-primary)] text-lg font-bold text-white shadow-lg" href="mailto:support@setika.com">
        @
      </a>
      <a className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-lg font-bold text-white shadow-lg" href="tel:+919873915391">
        ☎
      </a>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <Header />
      {children}
      <Footer />
      <FloatingActions />
    </main>
  );
}
