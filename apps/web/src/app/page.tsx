import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">MeetNotes <span className="text-emerald-400">HK</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition px-4 py-2">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-emerald-500 text-white px-5 py-2 rounded-lg hover:bg-emerald-400 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-emerald-500/20">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Built for Hong Kong professionals
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
            AI Meeting Notes
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              That Understand You
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The first meeting notes tool built for English + Cantonese code-mixed conversations. Record, transcribe, and get AI summaries in seconds.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
              Start Free
            </Link>
            <a href="#features" className="text-gray-400 px-6 py-3.5 rounded-xl text-base font-medium hover:bg-white/5 transition border border-gray-800">
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-emerald-900/20 bg-emerald-950/20 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-gray-500">
          {['300 free minutes/month', 'English + Cantonese', 'Chrome Extension', 'Export to PDF'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need after every meeting
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From recording to action items, MeetNotes HK handles the entire workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-950/50 to-emerald-950/20 rounded-2xl p-8 border border-emerald-800/30">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Record or Upload</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Record directly from Google Meet, Zoom, or Teams with our Chrome extension. Or upload any audio file.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-950/50 to-teal-950/20 rounded-2xl p-8 border border-teal-800/30">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Bilingual Transcription</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Powered by Deepgram Nova-2. Handles English, Cantonese, and seamless code-switching between both.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-950/50 to-green-950/20 rounded-2xl p-8 border border-green-800/30">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">AI Summaries</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Claude AI generates summaries, action items, key decisions, and notable quotes in English and Chinese.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-emerald-950/15">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Upload or Record', desc: 'Drop an audio file or record your meeting live' },
              { step: '2', title: 'Auto-Transcribe', desc: 'AI transcribes with speaker detection' },
              { step: '3', title: 'AI Summary', desc: 'Get structured notes, action items & decisions' },
              { step: '4', title: 'Share & Export', desc: 'Export to PDF, copy to clipboard, or share' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to transform your meetings?</h2>
          <p className="text-lg text-gray-500 mb-8">Start with 300 free minutes every month. No credit card required.</p>
          <Link href="/signup" className="inline-block bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-900/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span>MeetNotes HK</span>
          </div>
          <span>Built for Hong Kong</span>
        </div>
      </footer>
    </div>
  );
}
