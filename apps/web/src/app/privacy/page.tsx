import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080c0a] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-emerald-400 text-sm hover:text-emerald-300 mb-8 inline-block">&larr; Back to MeetNotes HK</Link>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: 29 March 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p>MeetNotes HK ("we", "our", "us") is an AI-powered meeting notes tool designed for Hong Kong professionals. This Privacy Policy explains how we collect, use, and protect your personal data in compliance with the Hong Kong Personal Data (Privacy) Ordinance (Cap. 486).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account Information:</strong> Email address, full name, and authentication credentials when you sign up.</li>
              <li><strong className="text-white">Audio Recordings:</strong> Meeting audio files you upload or record via our Chrome extension. These are stored securely in our cloud storage.</li>
              <li><strong className="text-white">Transcripts & Summaries:</strong> AI-generated transcriptions and summaries of your meetings.</li>
              <li><strong className="text-white">Usage Data:</strong> Minutes used, meeting count, and feature usage for billing and service improvement.</li>
              <li><strong className="text-white">Payment Information:</strong> Processed securely by Stripe. We do not store your credit card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To transcribe and summarise your meeting recordings using third-party AI services (Deepgram for speech-to-text, Anthropic Claude for summarisation).</li>
              <li>To provide, maintain, and improve our services.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To send you service-related notifications (not marketing).</li>
              <li>To export meeting notes to third-party services you connect (Notion, Slack, email) at your request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party processors:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Supabase:</strong> Database and authentication (hosted in Singapore).</li>
              <li><strong className="text-white">Deepgram:</strong> Speech-to-text transcription. Audio is sent to their API for processing.</li>
              <li><strong className="text-white">Anthropic (Claude):</strong> AI summarisation. Transcript text is sent for processing.</li>
              <li><strong className="text-white">Stripe:</strong> Payment processing. Subject to <a href="https://stripe.com/privacy" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
              <li><strong className="text-white">Vercel:</strong> Application hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Retention</h2>
            <p>Your audio recordings, transcripts, and summaries are retained as long as your account is active. You can delete individual meetings at any time, which permanently removes the audio, transcript, and summary. Upon account deletion, all your data is permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures including encrypted data transmission (TLS), encrypted storage, row-level security policies, and secure authentication. Access to your data is restricted to your account only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Your Rights</h2>
            <p>Under the Hong Kong PDPO, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Access your personal data held by us.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Delete your account and all associated data.</li>
              <li>Export your meeting data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>For privacy-related inquiries, contact us at <a href="mailto:privacy@meetnotes.hk" className="text-emerald-400 hover:underline">privacy@meetnotes.hk</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
