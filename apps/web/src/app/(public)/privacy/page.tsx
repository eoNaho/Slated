import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSection,
  LegalP,
  LegalList,
  LegalHighlight,
} from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — [APP_NAME]",
  description: "Learn how [APP_NAME] collects, uses, and protects your personal data.",
};

const SECTIONS = [
  { id: "intro", title: "1. Introduction" },
  { id: "data-collected", title: "2. Data We Collect" },
  { id: "how-we-use", title: "3. How We Use Your Data" },
  { id: "sharing", title: "4. Sharing & Disclosure" },
  { id: "retention", title: "5. Data Retention" },
  { id: "security", title: "6. Security" },
  { id: "children", title: "7. Children's Privacy" },
  { id: "rights-brazil", title: "8. Rights — Brazil (LGPD)" },
  { id: "rights-us", title: "9. Rights — United States (CCPA)" },
  { id: "international", title: "10. International Transfers" },
  { id: "cookies", title: "11. Cookies" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact & DPO" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="We are committed to protecting your personal data and your right to privacy."
      lastUpdated="[DATE]"
      sections={SECTIONS}
    >
      <LegalHighlight>
        This Privacy Policy explains how <strong>[COMPANY_NAME]</strong>{" "}
        (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
        stores, and shares information about you when you use{" "}
        <strong>[APP_NAME]</strong> (&quot;Service&quot;). It also describes
        your rights under the Brazilian General Data Protection Law (Lei Geral
        de Proteção de Dados — <strong>LGPD</strong>, Lei nº 13.709/2018) and
        the California Consumer Privacy Act (<strong>CCPA</strong>), among
        other applicable laws.
      </LegalHighlight>

      <LegalSection id="intro" title="1. Introduction">
        <LegalP>
          When you use [APP_NAME], you trust us with your personal data. We take
          that responsibility seriously. This policy is designed to be
          transparent about what we collect and why, so you can make informed
          choices about your use of the Service.
        </LegalP>
        <LegalP>
          [APP_NAME] is a social platform for movie and TV series enthusiasts.
          We collect data to provide, improve, and personalize your experience —
          not to sell it.
        </LegalP>
      </LegalSection>

      <LegalSection id="data-collected" title="2. Data We Collect">
        <h3 className="text-white font-medium mt-2 mb-2">
          2.1 Data You Provide Directly
        </h3>
        <LegalList
          items={[
            "Account information: name, username, email address, password (hashed), profile picture, and bio.",
            "Content you create: reviews, ratings, diary entries, lists, comments, and messages.",
            "Subscription information: billing details processed via Stripe (we do not store raw card numbers).",
            "Communications: support requests and feedback you send us.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          2.2 Data Collected Automatically
        </h3>
        <LegalList
          items={[
            "Usage data: pages visited, features used, interactions, and session duration.",
            "Device & browser information: IP address, browser type and version, operating system, and device identifiers.",
            "Log data: server access logs, error reports, and performance metrics.",
            "Cookies and similar tracking technologies (see Section 11).",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          2.3 Data from Third Parties
        </h3>
        <LegalList
          items={[
            "Movie and TV metadata from The Movie Database (TMDB API).",
            "Payment confirmation data from Stripe (e.g., subscription status, last 4 digits of card).",
          ]}
        />
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How We Use Your Data">
        <LegalP>
          We use your personal data for the following purposes and legal bases:
        </LegalP>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-zinc-300 font-medium py-2 pr-4">
                  Purpose
                </th>
                <th className="text-left text-zinc-300 font-medium py-2 pr-4">
                  Legal Basis (LGPD)
                </th>
                <th className="text-left text-zinc-300 font-medium py-2">
                  Legal Basis (US)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                [
                  "Create and manage your account",
                  "Contract performance",
                  "Contract performance",
                ],
                [
                  "Process payments and manage subscriptions",
                  "Contract performance",
                  "Contract performance",
                ],
                [
                  "Provide and operate the Service",
                  "Contract performance",
                  "Legitimate interest",
                ],
                [
                  "Personalize recommendations and content",
                  "Legitimate interest",
                  "Legitimate interest",
                ],
                [
                  "Send transactional emails (e.g., receipts, verification)",
                  "Contract performance",
                  "Contract performance",
                ],
                [
                  "Send product updates and newsletters",
                  "Consent",
                  "Opt-in consent",
                ],
                [
                  "Analyze and improve the Service",
                  "Legitimate interest",
                  "Legitimate interest",
                ],
                [
                  "Detect fraud and ensure security",
                  "Legal obligation / Legitimate interest",
                  "Legitimate interest",
                ],
                [
                  "Comply with legal obligations",
                  "Legal obligation",
                  "Legal obligation",
                ],
              ].map(([purpose, lgpd, us], i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 text-zinc-400">{purpose}</td>
                  <td className="py-2.5 pr-4 text-zinc-500">{lgpd}</td>
                  <td className="py-2.5 text-zinc-500">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="sharing" title="4. Sharing & Disclosure">
        <LegalP>
          We do not sell your personal data. We may share it in the following
          limited circumstances:
        </LegalP>
        <LegalList
          items={[
            "Service providers: Stripe (payments), email delivery providers, hosting and CDN providers, analytics tools. These are bound by data processing agreements and may only use your data to provide services to us.",
            "Legal requirements: if required by applicable law, court order, or governmental authority.",
            "Protection of rights: to enforce our Terms of Service, detect or prevent fraud, or protect the safety of our users.",
            "Business transfers: in the event of a merger, acquisition, or sale of all or substantially all of our assets, your data may be transferred. We will notify you via email and/or prominent notice on the Service.",
            "With your consent: for any other purpose with your explicit consent.",
          ]}
        />
        <LegalP>
          Public content you post (reviews, ratings, lists) may be visible to
          other users according to your privacy settings.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" title="5. Data Retention">
        <LegalP>
          We retain your personal data for as long as your account is active or
          as needed to provide the Service. Specifically:
        </LegalP>
        <LegalList
          items={[
            "Account data: retained while your account exists, and for up to 90 days after deletion to allow recovery.",
            "Billing records: retained for up to 7 years to comply with tax and financial regulations (or 5 years under Brazilian law, whichever is longer).",
            "Log and analytics data: retained for up to 12 months.",
            "Deleted content: may persist in backups for up to 30 days before permanent deletion.",
          ]}
        />
        <LegalP>
          You may request deletion of your account and personal data at any time
          from your account settings or by contacting us at{" "}
          <strong>[CONTACT_EMAIL]</strong>.
        </LegalP>
      </LegalSection>

      <LegalSection id="security" title="6. Security">
        <LegalP>
          We implement appropriate technical and organizational measures to
          protect your personal data against unauthorized access, alteration,
          disclosure, or destruction. These include:
        </LegalP>
        <LegalList
          items={[
            "Encryption of data in transit using TLS/HTTPS.",
            "Hashing of passwords using industry-standard algorithms.",
            "Access controls limiting data access to authorized personnel only.",
            "Regular security reviews and monitoring.",
          ]}
        />
        <LegalP>
          No method of transmission over the internet or electronic storage is
          100% secure. If you believe your account has been compromised, contact
          us immediately at <strong>[CONTACT_EMAIL]</strong>.
        </LegalP>
      </LegalSection>

      <LegalSection id="children" title="7. Children's Privacy">
        <LegalP>
          [APP_NAME] is not directed to children under 13 years of age. We do
          not knowingly collect personal information from children under 13. If
          you are a parent or guardian and believe your child has provided us
          with personal data, please contact us at{" "}
          <strong>[CONTACT_EMAIL]</strong> and we will delete the information
          promptly.
        </LegalP>
      </LegalSection>

      <LegalSection id="rights-brazil" title="8. Rights — Brazil (LGPD)">
        <LegalP>
          If you are located in Brazil, the Lei Geral de Proteção de Dados (LGPD
          — Lei nº 13.709/2018) grants you the following rights regarding your
          personal data:
        </LegalP>
        <LegalList
          items={[
            "Confirmation: confirm whether we process your personal data.",
            "Access: access your personal data in a clear and complete format.",
            "Correction: correct inaccurate, incomplete, or outdated data.",
            "Anonymization, blocking, or deletion: request anonymization, blocking, or deletion of unnecessary or excessive data, or data processed in violation of the LGPD.",
            "Data portability: receive your data in a structured, machine-readable format.",
            "Deletion: request deletion of personal data processed based on your consent.",
            "Information about sharing: obtain information about public and private entities with which we share your data.",
            "Revocation of consent: withdraw consent at any time.",
            "Review of automated decisions: request review of decisions made solely by automated means that affect your interests.",
            "Complaint to the ANPD: file a complaint with the Autoridade Nacional de Proteção de Dados (ANPD) at gov.br/anpd.",
          ]}
        />
        <LegalP>
          To exercise these rights, contact us at{" "}
          <strong>[CONTACT_EMAIL]</strong>. We will respond within 15 days as
          required by the LGPD.
        </LegalP>
      </LegalSection>

      <LegalSection id="rights-us" title="9. Rights — United States (CCPA)">
        <LegalP>
          If you are a California resident, the California Consumer Privacy Act
          (CCPA) and the California Privacy Rights Act (CPRA) grant you
          additional rights:
        </LegalP>
        <LegalList
          items={[
            "Right to Know: request disclosure of the categories and specific pieces of personal information we have collected about you.",
            "Right to Delete: request deletion of your personal information, subject to certain exceptions.",
            "Right to Correct: request correction of inaccurate personal information.",
            "Right to Opt-Out of Sale or Sharing: we do not sell or share your personal information for cross-context behavioral advertising.",
            "Right to Limit Use of Sensitive Personal Information: request that we limit the use of your sensitive personal information.",
            "Right to Non-Discrimination: we will not discriminate against you for exercising your CCPA rights.",
          ]}
        />
        <LegalP>
          To submit a verifiable consumer request, contact us at{" "}
          <strong>[CONTACT_EMAIL]</strong>. We will respond within 45 days.
          California residents may also designate an authorized agent to make
          requests on their behalf.
        </LegalP>
        <LegalP>
          For residents of other US states with applicable privacy laws
          (Virginia, Colorado, Connecticut, etc.), we will honor equivalent
          rights to the extent required by your state&apos;s law.
        </LegalP>
      </LegalSection>

      <LegalSection id="international" title="10. International Data Transfers">
        <LegalP>
          [APP_NAME] may process your personal data outside of your country of
          residence. When transferring data internationally, we ensure
          appropriate safeguards are in place, such as:
        </LegalP>
        <LegalList
          items={[
            "Standard contractual clauses approved by relevant data protection authorities.",
            "Data processing agreements with our service providers.",
            "Transfers to countries with adequate data protection levels as recognized by applicable authorities.",
          ]}
        />
        <LegalP>
          For Brazilian users: international transfers are conducted in
          accordance with Article 33 of the LGPD, which permits transfers to
          countries that provide an adequate degree of protection or when
          appropriate contractual guarantees are in place.
        </LegalP>
      </LegalSection>

      <LegalSection id="cookies" title="11. Cookies">
        <LegalP>
          We use cookies and similar technologies to operate and improve the
          Service. For detailed information, please read our{" "}
          <a
            href="/cookies"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Cookie Policy
          </a>
          .
        </LegalP>
        <LegalP>
          You can manage your cookie preferences through your browser settings
          or via the cookie consent tool available on the Service.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to This Policy">
        <LegalP>
          We may update this Privacy Policy periodically. When we make material
          changes, we will notify you by email or by posting a notice on the
          Service at least <strong>15 days</strong> before the changes take
          effect.
        </LegalP>
        <LegalP>
          We encourage you to review this policy periodically. Your continued
          use of the Service after changes become effective constitutes
          acceptance of the updated policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact & DPO">
        <LegalP>
          For any questions, requests, or concerns regarding this Privacy Policy
          or the processing of your personal data, please contact us:
        </LegalP>
        <LegalHighlight>
          <strong>[COMPANY_NAME]</strong>
          <br />
          Data Protection Officer (DPO): <strong>[DPO_NAME or [CONTACT_EMAIL]]</strong>
          <br />
          Email: <strong>[CONTACT_EMAIL]</strong>
          <br />
          Website: <strong>[APP_URL]</strong>
        </LegalHighlight>
        <LegalP>
          Brazilian users may also contact the Autoridade Nacional de Proteção
          de Dados (ANPD) at{" "}
          <strong>www.gov.br/anpd</strong> if they believe their rights under
          the LGPD have been violated.
        </LegalP>
      </LegalSection>
    </LegalLayout>
  );
}
