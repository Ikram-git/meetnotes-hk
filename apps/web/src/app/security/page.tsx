import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { BookDemoButton } from '@/components/book-demo-button';

export const metadata = {
  title: 'Security & Trust — Briva',
  description:
    'How Briva protects your meeting data: encryption in transit and at rest, no model training on customer data, configurable audio retention, workspace isolation, recording-consent guidance, and our compliance roadmap.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Marketing nav (matches /pricing) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
                <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xl font-bold text-white">Briva</div>
              <div className="text-[10px] font-medium italic text-emerald-400/90 tracking-wide">
                Hear Beyond Words.
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/pricing" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2 hidden sm:block">
              Pricing
            </Link>
            <Link href="/demo" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2 hidden sm:block">
              Demo
            </Link>
            <BookDemoButton variant="link" className="text-xs sm:text-sm px-2 sm:px-4 py-2 hidden md:inline-block">
              Book a demo
            </BookDemoButton>
            <ThemeToggle />
            <Link href="/signup" className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-emerald-400 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Security &amp; Trust
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Your meetings are yours.
            </h1>
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
              How Briva handles the data your team trusts us with — what we encrypt, what our
              vendors can do with it, how to delete everything, and what we&apos;re working towards next.
            </p>
            <p className="text-xs text-gray-600 mt-3">Last updated: 11 May 2026</p>
          </div>

          <div className="space-y-10">
            {/* Headline pillars */}
            <section className="grid sm:grid-cols-3 gap-3">
              <Pillar
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                title="No training on your data"
                body="Deepgram and Anthropic do not train models on data we send via their APIs."
              />
              <Pillar
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                title="Encrypted everywhere"
                body="TLS 1.2+ in transit, AES-256 at rest. Industry standard, by default."
              />
              <Pillar
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                }
                title="You control retention"
                body="Delete any meeting anytime. Configure audio auto-delete per workspace."
              />
            </section>

            {/* Data flow */}
            <Section title="Where your data goes">
              <p>
                When you record or upload a meeting, the audio flows through these systems and nowhere else:
              </p>
              <ol className="list-decimal pl-5 mt-3 space-y-2">
                <li>
                  <strong className="text-white">Your browser or desktop app → Briva</strong> over TLS. The desktop app
                  uses the same HTTPS endpoints — there&apos;s no separate channel.
                </li>
                <li>
                  <strong className="text-white">Briva → Deepgram</strong> for transcription. Audio is sent over TLS;
                  Deepgram returns text. Deepgram is a US-based, SOC 2 Type II certified provider and{' '}
                  <a href="https://deepgram.com/learn/data-privacy-deepgram" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">does not train models on customer audio</a>.
                </li>
                <li>
                  <strong className="text-white">Briva → Anthropic</strong> for AI summary and chat. Transcript text is sent
                  over TLS; Claude returns the summary. Anthropic{' '}
                  <a href="https://www.anthropic.com/legal/commercial-terms" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">does not train models on data submitted through the API by default</a>.
                </li>
                <li>
                  <strong className="text-white">Briva → Voyage AI</strong> for cross-meeting search embeddings. Short
                  chunks of transcript text are converted to vectors stored in our database. Voyage does not retain or
                  train on submitted content.
                </li>
                <li>
                  <strong className="text-white">Storage in Supabase</strong> (Singapore region) — audio, transcripts,
                  summaries, embeddings. Supabase uses AWS infrastructure with{' '}
                  <a href="https://supabase.com/security" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">SOC 2 Type II certification</a> and AES-256 encryption at rest.
                </li>
              </ol>
              <p className="mt-3 text-sm text-gray-500">
                We do not sell data. We do not share data with third parties for advertising or
                analytics purposes. Vendor list above is the complete pipeline.
              </p>
            </Section>

            {/* Encryption */}
            <Section title="Encryption">
              <ul className="space-y-2 list-disc pl-5">
                <li><strong className="text-white">In transit:</strong> TLS 1.2+ on every request — including the desktop app, the web app, and all vendor calls.</li>
                <li><strong className="text-white">At rest:</strong> AES-256 (database + object storage) via Supabase / AWS.</li>
                <li><strong className="text-white">Secrets:</strong> all third-party API keys (Deepgram, Anthropic, Voyage, Resend, Stripe) are server-side only — they never reach the browser. Live transcription uses short-lived scoped tokens issued by our server.</li>
                <li><strong className="text-white">Backups:</strong> Supabase performs daily encrypted backups with point-in-time recovery for our database tier.</li>
              </ul>
            </Section>

            {/* Retention */}
            <Section title="Retention & deletion">
              <p>You choose how long Briva keeps your raw audio:</p>
              <ul className="space-y-2 list-disc pl-5 mt-3">
                <li><strong className="text-white">Keep forever</strong> (default) — audio stays available for re-summarisation.</li>
                <li><strong className="text-white">Delete after processing</strong> — audio is deleted as soon as transcription + summary complete. Transcript and summary are retained.</li>
                <li><strong className="text-white">Delete after 7 / 30 days</strong> — a scheduled job removes the audio file on that timeline. Transcript and summary are retained.</li>
              </ul>
              <p className="mt-4">
                Workspace owners configure this in <span className="text-white">Settings → Team → Audio retention</span>.
                Individual meetings can also be deleted on demand — audio, transcript, summary, embeddings, comments, and
                tasks are removed permanently within minutes.
              </p>
              <p className="mt-3">
                Account deletion is honoured within 30 days; all personal data is purged from primary storage. Anonymised
                billing records are retained where required by HK / EU tax law.
              </p>
            </Section>

            {/* Access */}
            <Section title="Workspace isolation">
              <p>
                Every meeting belongs to exactly one workspace. Access is enforced at the database layer using
                PostgreSQL row-level security (RLS) — there is no application-layer-only check.
              </p>
              <ul className="space-y-2 list-disc pl-5 mt-3">
                <li><strong className="text-white">Members:</strong> only users in a workspace&apos;s member list can read its meetings.</li>
                <li><strong className="text-white">Removed members:</strong> losing membership instantly revokes access — their session can still issue requests, but RLS denies them.</li>
                <li><strong className="text-white">Roles:</strong> owner / admin / member with explicit write permissions per role.</li>
                <li><strong className="text-white">Share links:</strong> non-guessable IDs (random tokens, never sequential), optional password protection, revocable from the share dialog.</li>
              </ul>
            </Section>

            {/* Consent */}
            <Section title="Recording consent">
              <p>
                Recording laws vary by jurisdiction — Hong Kong and most APAC markets allow one-party consent; California
                and the EU require all-party consent in many contexts. Briva surfaces a reminder before any live recording
                starts so the person recording is responsible for verifying consent with the other participants.
              </p>
              <p className="mt-3">
                <strong className="text-white">Our commitment:</strong> we do not auto-join meetings on a user&apos;s behalf
                without their explicit action. Every recording is initiated by a Briva user who is present in the meeting
                or has explicit recording authority.
              </p>
            </Section>

            {/* Vendor list */}
            <Section title="Our vendors">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-emerald-900/30">
                    <th className="py-2 pr-3 font-medium">Vendor</th>
                    <th className="py-2 pr-3 font-medium">Purpose</th>
                    <th className="py-2 font-medium">Region / certs</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://deepgram.com/learn/data-privacy-deepgram" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Deepgram</a></td>
                    <td className="py-2 pr-3">Speech-to-text</td>
                    <td className="py-2">US · SOC 2 Type II · No training on customer audio</td>
                  </tr>
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://www.anthropic.com/legal/commercial-terms" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Anthropic</a></td>
                    <td className="py-2 pr-3">AI summary &amp; chat (Claude)</td>
                    <td className="py-2">US · SOC 2 Type II · No training on API data by default</td>
                  </tr>
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://www.voyageai.com/" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Voyage AI</a></td>
                    <td className="py-2 pr-3">Embeddings for cross-meeting search</td>
                    <td className="py-2">US · No training, no retention beyond request</td>
                  </tr>
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://supabase.com/security" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Supabase</a></td>
                    <td className="py-2 pr-3">Database + audio storage</td>
                    <td className="py-2">Singapore · SOC 2 Type II · AES-256 at rest</td>
                  </tr>
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://vercel.com/security" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Vercel</a></td>
                    <td className="py-2 pr-3">Application hosting / edge</td>
                    <td className="py-2">Global · SOC 2 Type II</td>
                  </tr>
                  <tr className="border-b border-emerald-900/20">
                    <td className="py-2 pr-3"><a href="https://resend.com/legal/privacy-policy" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Resend</a></td>
                    <td className="py-2 pr-3">Transactional email (recaps, invites)</td>
                    <td className="py-2">US · GDPR-compliant</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3"><a href="https://stripe.com/privacy" className="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">Stripe</a></td>
                    <td className="py-2 pr-3">Subscription billing</td>
                    <td className="py-2">US · PCI DSS Level 1 · No payment data on our servers</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Compliance roadmap */}
            <Section title="Compliance roadmap">
              <p>
                We&apos;re a young company and we&apos;re upfront about what we have versus what we&apos;re working on:
              </p>
              <ul className="space-y-2 list-disc pl-5 mt-3">
                <li><strong className="text-white">Today:</strong> All vendors above are SOC 2 Type II or equivalent. Our own application enforces RLS, TLS, AES-256, and least-privilege secrets.</li>
                <li><strong className="text-white">Q3 2026:</strong> Third-party penetration test against the production stack. Findings published as a redacted summary on request.</li>
                <li><strong className="text-white">Q4 2026:</strong> Data Processing Addendum (DPA) template for enterprise customers; GDPR alignment for EU prospects.</li>
                <li><strong className="text-white">2027:</strong> SOC 2 Type II audit. Existing controls are designed to map cleanly; the audit formalises them.</li>
                <li><strong className="text-white">Later:</strong> ISO 27001. We&apos;ll prioritise it once paying enterprise customers ask.</li>
              </ul>
            </Section>

            {/* Reporting */}
            <Section title="Reporting a security concern">
              <p>
                If you believe you&apos;ve found a vulnerability, please email{' '}
                <a href="mailto:sattarikram81@gmail.com?subject=Briva%20security%20report" className="text-emerald-400 hover:text-emerald-300 underline">
                  sattarikram81@gmail.com
                </a>{' '}
                with a description and reproduction steps. We&apos;ll acknowledge within one business day and follow up
                with a triage timeline.
              </p>
              <p className="mt-3">
                We do not currently operate a paid bug bounty programme, but we&apos;re happy to publicly credit responsible
                disclosures.
              </p>
            </Section>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center bg-[#111916] border border-emerald-900/30 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-2">Need a one-pager for your IT team?</h2>
            <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">
              We have a vendor-evaluation packet covering data flow, encryption, retention, and our compliance roadmap.
              Tell us a little about your team and we&apos;ll send it over.
            </p>
            <BookDemoButton variant="primary" size="md" className="px-6 py-3 text-sm">
              Request the security packet
            </BookDemoButton>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-400">Briva</span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <span className="hidden sm:inline italic text-emerald-500/80">Hear Beyond Words.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-gray-400 transition">Home</Link>
            <Link href="/pricing" className="hover:text-gray-400 transition">Pricing</Link>
            <Link href="/security" className="hover:text-gray-400 transition">Security</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#111916] border border-emerald-900/30 rounded-2xl p-6 sm:p-8">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-sm text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-sm font-semibold text-white mb-1">{title}</div>
      <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
    </div>
  );
}
