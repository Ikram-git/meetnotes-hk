import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#080c0a] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-emerald-400 text-sm hover:text-emerald-300 mb-8 inline-block">&larr; Back to MeetNotes HK</Link>
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: 29 March 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using MeetNotes HK ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>MeetNotes HK provides AI-powered meeting transcription and summarisation for professionals. The Service includes a web application, Chrome browser extension, and related APIs. The Service supports English and Cantonese (code-mixed) audio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>One person or entity may not maintain more than one free account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Record meetings without the consent of all participants where required by law.</li>
              <li>Upload content that violates any applicable laws or third-party rights.</li>
              <li>Use the Service for any illegal, harmful, or abusive purpose.</li>
              <li>Attempt to reverse-engineer, decompile, or hack the Service.</li>
              <li>Resell or redistribute the Service without our written consent.</li>
              <li>Exceed your plan's usage limits through automated or abusive means.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Recording Consent</h2>
            <p>You are solely responsible for obtaining appropriate consent from all meeting participants before recording. Laws regarding recording consent vary by jurisdiction. In Hong Kong, it is generally legal to record a conversation you are a party to, but we recommend informing all participants. MeetNotes HK is not liable for any unauthorised recordings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Content</h2>
            <p>You retain ownership of all audio recordings, transcripts, and summaries generated through the Service ("Your Content"). By using the Service, you grant us a limited licence to process Your Content solely for the purpose of providing the Service (transcription, summarisation, storage, and export). We do not use Your Content for training AI models or any purpose other than delivering the Service to you.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Subscriptions & Billing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Free accounts include 300 minutes of transcription per month.</li>
              <li>Paid subscriptions are billed monthly or annually in HKD via Stripe.</li>
              <li>You may cancel your subscription at any time. Access continues until the end of your billing period.</li>
              <li>Refunds are handled on a case-by-case basis.</li>
              <li>We reserve the right to change pricing with 30 days' notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Service Availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted service. We are not liable for any downtime, data loss, or service interruptions. AI-generated transcriptions and summaries may contain errors — always verify important information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by Hong Kong law, MeetNotes HK and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time. Upon termination, your data will be permanently deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the Hong Kong Special Administrative Region. Any disputes shall be subject to the exclusive jurisdiction of the courts of Hong Kong.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@meetnotes.hk" className="text-emerald-400 hover:underline">support@meetnotes.hk</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
