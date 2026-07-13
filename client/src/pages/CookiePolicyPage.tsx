import React from 'react';
import { Cookie } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
    <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const CookiePolicyPage = () => {
  return (
    <div className="space-y-8 py-6 animate-fade-in text-left max-w-3xl mx-auto">
      <div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
          <span>/</span>
          <span className="text-blue-600">Cookie Policy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex flex-wrap items-center gap-2">
          <Cookie className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" /> Cookie Policy
        </h1>
        <p className="text-sm text-slate-500 mt-1">Last updated: July 2026</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-6 space-y-6">
        <Section title="1. What Are Cookies?">
          <p>Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, improve your experience, and analyze how you use our site.</p>
        </Section>

        <Section title="2. Types of Cookies We Use">
          <p><strong>Essential Cookies:</strong> Required for the website to function properly. These include session cookies for login and cart management.</p>
          <p><strong>Performance Cookies:</strong> Help us understand how visitors use our website by collecting anonymous data. This helps us improve our services.</p>
          <p><strong>Functional Cookies:</strong> Remember your preferences and settings to provide a personalized experience.</p>
          <p><strong>Marketing Cookies:</strong> Used to track your activity across websites to deliver targeted advertisements.</p>
        </Section>

        <Section title="3. Specific Cookies We Use">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>bluetech_token:</strong> Stores your authentication token for login sessions</li>
            <li><strong>bluetech_user:</strong> Stores your user profile information</li>
            <li><strong>bluetech_cart:</strong> Stores your shopping cart items</li>
            <li><strong>_ga:</strong> Google Analytics cookie for tracking website usage</li>
            <li><strong>_gid:</strong> Google Analytics cookie for session identification</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Cookies">
          <p>We use third-party services like Google Analytics that may set their own cookies. These services have their own privacy policies governing their use of cookies.</p>
        </Section>

        <Section title="5. Cookie Duration">
          <p>Session cookies are deleted when you close your browser. Persistent cookies remain on your device for a specified period (typically 30 days to 1 year) unless you delete them manually.</p>
        </Section>

        <Section title="6. Your Cookie Choices">
          <p>Most browsers allow you to control cookies through their settings. You can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Accept all cookies</li>
            <li>Reject all cookies</li>
            <li>Delete existing cookies</li>
            <li>Set your browser to notify you when a cookie is being set</li>
          </ul>
          <p className="mt-2">Note: Disabling essential cookies may affect website functionality.</p>
        </Section>

        <Section title="7. Do Not Track">
          <p>Some browsers include a "Do Not Track" feature. Our website currently does not respond to Do Not Track signals, but you can use your browser settings to control cookies.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>BlueTech may update this Cookie Policy at any time. Changes will be effective immediately upon posting. Your continued use of the website constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="9. Contact Us">
          <p>If you have questions about our use of cookies, please contact us:</p>
          <ul className="list-none space-y-1 pl-2">
            <li>📧 <a href="mailto:support@bluetech.co.ke" className="text-blue-600 hover:underline">support@bluetech.co.ke</a></li>
            <li>📞 <a href="tel:+254700000000" className="text-blue-600 hover:underline">+254 700 000 000</a></li>
          </ul>
        </Section>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
