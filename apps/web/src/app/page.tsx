import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-bg overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[8%] py-6">
        <span className="font-headline text-sm font-medium uppercase tracking-nav text-text-primary">
          SUSTAINMETRIC
        </span>
        <div className="flex items-center gap-8">
          <Link
            href="/app/map"
            className="text-xs uppercase tracking-nav text-text-secondary hover:text-text-primary transition-colors duration-rail ease-rail"
          >
            ENGINE
          </Link>
          <span className="text-xs uppercase tracking-nav text-text-secondary hover:text-text-primary transition-colors duration-rail ease-rail cursor-pointer">
            ABOUT
          </span>
          <span className="text-xs uppercase tracking-nav text-text-secondary hover:text-text-primary transition-colors duration-rail ease-rail cursor-pointer">
            CONTACT
          </span>
        </div>
      </nav>

      {/* Hero section — asymmetric layout */}
      <section className="relative min-h-screen flex items-center">
        {/* Background satellite image — right 60% */}
        <div className="absolute right-0 top-0 bottom-0 w-[60%]">
          <div className="absolute inset-0 bg-gradient-to-bl from-accent-heat/20 via-bg to-bg" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
        </div>

        {/* Text content — left 30% starting at 8% */}
        <div className="relative z-10 pl-[8%] max-w-[540px]">
          <h1 className="font-headline text-3xl uppercase leading-[0.95] tracking-headline font-medium mb-8">
            SEEING THE CITIES
            <br />
            WE CANNOT FEEL
          </h1>

          <p className="font-body text-base leading-relaxed text-text-secondary mb-12 max-w-[440px]">
            The first multimodal intelligence engine that reads the data Indian
            cities generate and turns it into climate action a corporate auditor
            will accept.
          </p>

          <Link
            href="/app/map"
            className="inline-flex items-center gap-3 border border-white px-7 py-3.5 text-sm uppercase tracking-button font-medium text-white hover:bg-white/[0.08] transition-all duration-rail ease-rail"
          >
            LAUNCH THE ENGINE
            <span className="text-lg">&#8594;</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
