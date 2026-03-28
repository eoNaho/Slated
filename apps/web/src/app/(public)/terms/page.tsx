import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSection,
  LegalP,
  LegalList,
  LegalHighlight,
} from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service — [APP_NAME]",
  description: "Read the Terms of Service for [APP_NAME].",
};

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "eligibility", title: "2. Eligibility" },
  { id: "account", title: "3. Your Account" },
  { id: "subscription", title: "4. Subscription & Billing" },
  { id: "user-content", title: "5. User Content" },
  { id: "conduct", title: "6. Prohibited Conduct" },
  { id: "ip", title: "7. Intellectual Property" },
  { id: "third-party", title: "8. Third-Party Services" },
  { id: "disclaimers", title: "9. Disclaimers" },
  { id: "liability", title: "10. Limitation of Liability" },
  { id: "governing-law", title: "11. Governing Law" },
  { id: "changes", title: "12. Changes to Terms" },
  { id: "contact", title: "13. Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these terms carefully before using [APP_NAME]."
      lastUpdated="[DATE]"
      sections={SECTIONS}
    >
      <LegalHighlight>
        These Terms of Service (&quot;Terms&quot;) constitute a legally binding
        agreement between you and <strong>[COMPANY_NAME]</strong> (&quot;we&quot;,
        &quot;us&quot;, or &quot;our&quot;) governing your access to and use of{" "}
        <strong>[APP_NAME]</strong> and its related services (collectively, the
        &quot;Service&quot;). By accessing or using the Service, you confirm that
        you have read, understood, and agree to be bound by these Terms.
      </LegalHighlight>

      <LegalSection id="acceptance" title="1. Acceptance of Terms">
        <LegalP>
          By creating an account, accessing, or using any part of [APP_NAME],
          you agree to these Terms and our Privacy Policy. If you do not agree,
          you must not use the Service.
        </LegalP>
        <LegalP>
          If you are using the Service on behalf of a company or other legal
          entity, you represent that you have the authority to bind that entity
          to these Terms.
        </LegalP>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <LegalP>
          You must be at least <strong>13 years old</strong> to use [APP_NAME].
          If you are under 18, you must have your parent or guardian&apos;s
          consent to use the Service. By using [APP_NAME], you represent and
          warrant that you meet these eligibility requirements.
        </LegalP>
        <LegalP>
          We do not knowingly collect personal information from children under
          13. If we become aware that a child under 13 has provided us with
          personal data, we will delete it promptly. If you believe this has
          occurred, contact us at <strong>[CONTACT_EMAIL]</strong>.
        </LegalP>
        <LegalP>
          Access to [APP_NAME] is not permitted in jurisdictions where the
          Service is prohibited by applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection id="account" title="3. Your Account">
        <LegalP>
          To access certain features you must create an account. You agree to:
        </LegalP>
        <LegalList
          items={[
            "Provide accurate, current, and complete information during registration.",
            "Maintain and promptly update your account information.",
            "Keep your password secure and confidential.",
            "Notify us immediately of any unauthorized use of your account at [CONTACT_EMAIL].",
            "Be responsible for all activity that occurs under your account.",
          ]}
        />
        <LegalP>
          We reserve the right to suspend or terminate accounts that violate
          these Terms, engage in fraudulent activity, or remain inactive for an
          extended period.
        </LegalP>
      </LegalSection>

      <LegalSection id="subscription" title="4. Subscription & Billing">
        <LegalP>
          [APP_NAME] offers both free and paid subscription plans. Paid plans
          grant access to additional features as described on our pricing page.
        </LegalP>

        <h3 className="text-white font-medium mt-6 mb-2">4.1 Billing</h3>
        <LegalList
          items={[
            "Paid subscriptions are billed on a monthly recurring basis.",
            "Payment is processed through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis.",
            "All prices are displayed in USD and may be subject to applicable taxes depending on your location.",
            "Your subscription renews automatically at the end of each billing period unless cancelled.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          4.2 Cancellation & Refunds
        </h3>
        <LegalList
          items={[
            "You may cancel your subscription at any time from your account settings.",
            "Cancellation takes effect at the end of the current billing period. You will retain access to paid features until then.",
            "We do not offer refunds for partial billing periods, except where required by applicable law.",
            "For Brazilian users: under the Brazilian Consumer Protection Code (CDC), you have the right to cancel and receive a full refund within 7 (seven) calendar days of the initial subscription if the contract was entered into outside of a physical establishment (direito de arrependimento).",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">4.3 Price Changes</h3>
        <LegalP>
          We may change subscription prices with at least 30 days&apos; advance
          notice. Continued use of the paid Service after the price change
          constitutes your acceptance of the new price.
        </LegalP>
      </LegalSection>

      <LegalSection id="user-content" title="5. User Content">
        <LegalP>
          [APP_NAME] allows you to submit, post, and share content including
          reviews, ratings, lists, comments, and other materials
          (&quot;User Content&quot;). You retain ownership of your User Content.
        </LegalP>

        <h3 className="text-white font-medium mt-6 mb-2">5.1 License to Us</h3>
        <LegalP>
          By submitting User Content, you grant [COMPANY_NAME] a worldwide,
          non-exclusive, royalty-free, sublicensable, and transferable license
          to use, reproduce, distribute, display, and adapt your User Content in
          connection with operating and improving the Service.
        </LegalP>

        <h3 className="text-white font-medium mt-6 mb-2">
          5.2 Your Representations
        </h3>
        <LegalP>You represent and warrant that:</LegalP>
        <LegalList
          items={[
            "You own or have the necessary rights to the User Content you submit.",
            "Your User Content does not infringe any third-party intellectual property, privacy, or other rights.",
            "Your User Content complies with these Terms and all applicable laws.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          5.3 Content Removal
        </h3>
        <LegalP>
          We reserve the right to remove any User Content that violates these
          Terms, is reported as infringing, or that we determine in our sole
          discretion is harmful, offensive, or otherwise objectionable.
        </LegalP>
      </LegalSection>

      <LegalSection id="conduct" title="6. Prohibited Conduct">
        <LegalP>
          You agree not to use the Service to:
        </LegalP>
        <LegalList
          items={[
            "Post content that is defamatory, hateful, harassing, threatening, obscene, or discriminatory.",
            "Impersonate any person or entity, or misrepresent your affiliation with any person or entity.",
            "Upload or transmit viruses, malware, or any other harmful code.",
            "Scrape, crawl, or extract data from the Service without our prior written consent.",
            "Attempt to gain unauthorized access to any part of the Service or its related systems.",
            "Engage in any activity that disrupts or interferes with the Service.",
            "Post spam, unsolicited messages, or promotional content.",
            "Use the Service for any unlawful purpose or in violation of these Terms.",
            "Create multiple accounts to evade a suspension or ban.",
          ]}
        />
      </LegalSection>

      <LegalSection id="ip" title="7. Intellectual Property">
        <LegalP>
          The [APP_NAME] name, logo, design, software, and all content provided
          by us (excluding User Content) are the property of [COMPANY_NAME] or
          our licensors and are protected by copyright, trademark, and other
          intellectual property laws.
        </LegalP>
        <LegalP>
          Movie metadata, images, and related data displayed on [APP_NAME] are
          provided by The Movie Database (TMDB) API. This product uses the TMDB
          API but is not endorsed or certified by TMDB.
        </LegalP>
        <LegalP>
          If you believe any content on the Service infringes your copyright,
          please send a DMCA notice to <strong>[CONTACT_EMAIL]</strong> with the
          following information: (i) your contact details, (ii) identification
          of the copyrighted work, (iii) identification of the infringing
          material and its location, (iv) a statement of good faith belief, and
          (v) your signature.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party" title="8. Third-Party Services">
        <LegalP>
          The Service integrates with or links to third-party services including:
        </LegalP>
        <LegalList
          items={[
            "Stripe — for payment processing. Your payment data is subject to Stripe's Privacy Policy.",
            "The Movie Database (TMDB) — for movie and TV series metadata.",
            "Analytics and monitoring services to help us improve the Service.",
          ]}
        />
        <LegalP>
          We are not responsible for the content, privacy practices, or terms of
          any third-party services. Your interactions with them are governed by
          their own policies.
        </LegalP>
      </LegalSection>

      <LegalSection id="disclaimers" title="9. Disclaimers">
        <LegalP>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING
          BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
        </LegalP>
        <LegalP>
          We do not warrant that: (a) the Service will be uninterrupted or
          error-free; (b) any content on the Service is accurate, complete, or
          current; (c) the Service is free of viruses or other harmful
          components.
        </LegalP>
        <LegalP>
          Some jurisdictions do not allow the exclusion of implied warranties.
          If you are a Brazilian consumer, the provisions of the Brazilian
          Consumer Protection Code (Lei nº 8.078/90) that cannot be waived by
          contract will continue to apply.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" title="10. Limitation of Liability">
        <LegalP>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, [COMPANY_NAME] AND
          ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </LegalP>
        <LegalP>
          IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING
          FROM OR RELATED TO THE SERVICE EXCEED THE GREATER OF: (A) THE AMOUNT
          YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) USD $50.
        </LegalP>
        <LegalP>
          For users located in Brazil: nothing in these Terms limits or excludes
          liability that cannot be limited or excluded under the Brazilian
          Consumer Protection Code or other mandatory applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection id="governing-law" title="11. Governing Law">
        <LegalP>
          These Terms and any dispute arising from them shall be governed as
          follows:
        </LegalP>
        <LegalList
          items={[
            "For users located in Brazil: these Terms are governed by the laws of the Federative Republic of Brazil. Disputes shall be resolved in the courts of [CITY], Brazil, or through PROCON/consumer protection bodies as applicable.",
            "For users located in the United States and all other users: these Terms are governed by the laws of the State of [STATE], USA, without regard to conflict-of-law principles. Disputes shall be resolved in the courts of [STATE], USA.",
          ]}
        />
        <LegalP>
          Regardless of jurisdiction, you and [COMPANY_NAME] agree to first
          attempt to resolve any dispute informally by contacting us at{" "}
          <strong>[CONTACT_EMAIL]</strong>.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to Terms">
        <LegalP>
          We may update these Terms from time to time. When we make material
          changes, we will notify you by email or by posting a prominent notice
          on the Service at least <strong>15 days</strong> before the changes
          take effect (or 30 days for paid subscription changes).
        </LegalP>
        <LegalP>
          Your continued use of the Service after the effective date of the
          revised Terms constitutes your acceptance of the changes. If you do
          not agree to the updated Terms, you must stop using the Service and
          cancel any active subscription.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact">
        <LegalP>
          If you have questions about these Terms, please contact us:
        </LegalP>
        <LegalHighlight>
          <strong>[COMPANY_NAME]</strong>
          <br />
          Email: <strong>[CONTACT_EMAIL]</strong>
          <br />
          Website: <strong>[APP_URL]</strong>
        </LegalHighlight>
      </LegalSection>
    </LegalLayout>
  );
}
