import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import LegalShell from '../components/common/LegalShell';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const PrivacyPolicyPage = () => {
  return (
    <LegalShell icon={<Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" />} title="Privacy Policy">

        <Section title="1. Information We Collect">
          <p>When you create an account, place an order, or book a repair, we collect personal information including your full name, email address, phone number, and delivery address.</p>
          <p>We also collect usage data such as pages visited, products viewed, and device/browser information to improve our services.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Process and fulfill your orders and repair bookings</li>
            <li>Send order confirmations and status updates via SMS or email</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Improve our website, products, and services</li>
            <li>Send promotional offers (only with your consent)</li>
          </ul>
        </Section>

        <Section title="3. Sharing Your Information">
          <p>We do not sell or rent your personal data to third parties. We may share your information with:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Delivery partners to fulfill your orders</li>
            <li>Payment processors to complete transactions securely</li>
            <li>Service providers who assist in operating our platform</li>
          </ul>
          <p>All third parties are contractually obligated to keep your data confidential.</p>
        </Section>

        <Section title="4. Data Security">
          <p>We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and access controls to protect your personal information from unauthorized access or disclosure.</p>
        </Section>

        <Section title="5. Cookies">
          <p>We use cookies and similar technologies to maintain your session, remember your cart, and analyze site traffic. You can disable cookies in your browser settings, though some features may not function correctly.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You have the right to access, correct, or delete your personal data at any time. You may also opt out of marketing communications. To exercise these rights, contact us at the details below.</p>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice on our website. Continued use of our services after changes constitutes acceptance.</p>
        </Section>

        <Section title="9. Contact Us">
          <p>If you have any questions about this Privacy Policy or how we handle your data, please reach out:</p>
          <ul className="list-none space-y-1 pl-2">
            <li>📧 <a href="mailto:support@bluetech.co.ke" className="text-blue-600 hover:underline">support@bluetech.co.ke</a></li>
            <li>📞 <a href="tel:+254700000000" className="text-blue-600 hover:underline">+254 700 000 000</a></li>
            <li>🌐 <Link to="/contact" className="text-blue-600 hover:underline">Contact Form</Link></li>
          </ul>
        </Section>

    </LegalShell>
  );
};

export default PrivacyPolicyPage;
