import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import LegalShell from '../components/common/LegalShell';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
    <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const TermsOfServicePage = () => {
  return (
    <LegalShell icon={<FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" />} title="Terms of Service">
        <Section title="1. Acceptance of Terms">
          <p>By accessing and using BlueTech's website and services, you agree to be bound by these Terms of Service. If you do not agree to any part of these terms, you may not use our services.</p>
        </Section>

        <Section title="2. Use License">
          <p>Permission is granted to temporarily download one copy of the materials (information or software) on BlueTech's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the website</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>
        </Section>

        <Section title="3. Product Information">
          <p>BlueTech strives to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions, pricing, or other content is accurate, complete, reliable, current, or error-free. If a product offered by BlueTech is not as described, your sole remedy is to return it in unused condition.</p>
        </Section>

        <Section title="4. Pricing and Availability">
          <p>All prices are subject to change without notice. BlueTech reserves the right to limit quantities and to discontinue any product. Products are subject to availability and valid while supplies last.</p>
        </Section>

        <Section title="5. Order Acceptance">
          <p>BlueTech reserves the right to refuse or cancel any order. We may require additional verifications or information before accepting any order. By placing an order, you represent that you are at least 18 years old and have the legal right to enter into binding contracts.</p>
        </Section>

        <Section title="6. Payment">
          <p>Payment must be received before order fulfillment. We accept M-Pesa and Cash on Delivery. All transactions are processed securely. You agree to pay all charges incurred by you or any users of your account.</p>
        </Section>

        <Section title="7. Delivery and Shipping">
          <p>Delivery times are estimates only and not guaranteed. BlueTech is not responsible for delays caused by courier services, weather, or other unforeseen circumstances. Risk of loss passes to you upon delivery to the courier.</p>
        </Section>

        <Section title="8. Returns and Refunds">
          <p>Items may be returned within 7 days if defective, wrong, or significantly different from the listing. Items must be in original condition with all packaging. Refunds are processed within 5-7 business days after inspection. See our Returns & Refunds page for full details.</p>
        </Section>

        <Section title="9. Repair Services">
          <p>Repair services are provided on an as-is basis. BlueTech provides a 90-day warranty on repair work and replaced parts. Diagnostics are free; if you decline repair after diagnosis, a small assessment fee may apply. We are not responsible for data loss during repairs.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>In no event shall BlueTech be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, arising out of or in connection with your use of the website or services.</p>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to indemnify and hold harmless BlueTech from any claims, damages, or costs arising from your violation of these terms or your use of the website.</p>
        </Section>

        <Section title="12. Modifications to Terms">
          <p>BlueTech reserves the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website constitutes acceptance of the modified terms.</p>
        </Section>

        <Section title="13. Governing Law">
          <p>These terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi.</p>
        </Section>

        <Section title="14. Contact Us">
          <p>If you have questions about these Terms of Service, please contact us:</p>
          <ul className="list-none space-y-1 pl-2">
            <li>📧 <a href="mailto:support@bluetech.co.ke" className="text-blue-600 hover:underline">support@bluetech.co.ke</a></li>
            <li>📞 <a href="tel:+254700000000" className="text-blue-600 hover:underline">+254 700 000 000</a></li>
          </ul>
        </Section>
    </LegalShell>
  );
};

export default TermsOfServicePage;
