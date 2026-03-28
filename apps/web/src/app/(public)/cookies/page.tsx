import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSection,
  LegalP,
  LegalList,
  LegalHighlight,
} from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Cookie Policy — [APP_NAME]",
  description: "Learn how [APP_NAME] uses cookies and similar tracking technologies.",
};

const SECTIONS = [
  { id: "what-are-cookies", title: "1. What Are Cookies?" },
  { id: "types", title: "2. Types of Cookies We Use" },
  { id: "third-party", title: "3. Third-Party Cookies" },
  { id: "managing", title: "4. Managing Cookies" },
  { id: "do-not-track", title: "5. Do Not Track" },
  { id: "changes", title: "6. Changes to This Policy" },
  { id: "contact", title: "7. Contact" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="This policy explains how and why we use cookies and similar technologies."
      lastUpdated="[DATE]"
      sections={SECTIONS}
    >
      <LegalHighlight>
        This Cookie Policy applies to <strong>[APP_NAME]</strong> (the
        &quot;Service&quot;) operated by <strong>[COMPANY_NAME]</strong>. It
        explains what cookies are, the types of cookies we use, and how you can
        control them. This policy should be read alongside our{" "}
        <a
          href="/privacy"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Privacy Policy
        </a>
        .
      </LegalHighlight>

      <LegalSection id="what-are-cookies" title="1. What Are Cookies?">
        <LegalP>
          Cookies are small text files placed on your device (computer, tablet,
          or mobile) when you visit a website. They help websites recognize your
          device, remember your preferences, and understand how you interact with
          the site.
        </LegalP>
        <LegalP>
          Similar technologies include local storage, session storage, and pixels
          (also called web beacons), which function analogously to cookies. This
          policy covers all such technologies collectively referred to as
          &quot;cookies&quot;.
        </LegalP>
      </LegalSection>

      <LegalSection id="types" title="2. Types of Cookies We Use">
        <h3 className="text-white font-medium mt-2 mb-2">
          2.1 Strictly Necessary Cookies
        </h3>
        <LegalP>
          These cookies are essential for the Service to function and cannot be
          disabled. They are set in response to actions you take, such as logging
          in, setting privacy preferences, or filling in forms.
        </LegalP>
        <LegalList
          items={[
            "Session cookies: keep you logged in while you navigate the Service.",
            "Security cookies: help detect and prevent fraudulent activity.",
            "Load balancing cookies: ensure the Service performs reliably.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          2.2 Functional Cookies
        </h3>
        <LegalP>
          These cookies enable enhanced functionality and personalization. They
          may be set by us or by third-party providers whose services we use.
        </LegalP>
        <LegalList
          items={[
            "Preference cookies: remember your settings such as language, theme, and display preferences.",
            "Authentication cookies: remember that you are logged in so you don't have to sign in again on each page.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          2.3 Analytics Cookies
        </h3>
        <LegalP>
          These cookies help us understand how visitors interact with the
          Service. All information collected is aggregated and anonymized.
        </LegalP>
        <LegalList
          items={[
            "Page view and session analytics: understand which features are used most.",
            "Error and performance monitoring: detect crashes and slow-loading pages.",
            "A/B testing: evaluate the performance of new features.",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          2.4 Marketing Cookies
        </h3>
        <LegalP>
          We may use limited marketing cookies to measure the effectiveness of
          our own campaigns. We do <strong>not</strong> use cookies to serve
          third-party advertising or to sell your data to advertisers.
        </LegalP>
        <LegalList
          items={[
            "Conversion tracking: understand whether users who clicked our ads signed up for the Service.",
            "Retargeting: show [APP_NAME] ads to users who have previously visited the Service, via third-party platforms.",
          ]}
        />

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-zinc-300 font-medium py-2 pr-4">Category</th>
                <th className="text-left text-zinc-300 font-medium py-2 pr-4">Required?</th>
                <th className="text-left text-zinc-300 font-medium py-2">Consent needed?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["Strictly Necessary", "Yes", "No"],
                ["Functional", "No", "Yes (LGPD/GDPR regions)"],
                ["Analytics", "No", "Yes (LGPD/GDPR regions)"],
                ["Marketing", "No", "Yes"],
              ].map(([cat, req, consent], i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 text-zinc-400">{cat}</td>
                  <td className="py-2.5 pr-4 text-zinc-500">{req}</td>
                  <td className="py-2.5 text-zinc-500">{consent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="third-party" title="3. Third-Party Cookies">
        <LegalP>
          Some features of the Service involve third-party services that may set
          their own cookies on your device. These include:
        </LegalP>
        <LegalList
          items={[
            "Stripe: sets cookies to ensure secure payment processing and fraud prevention. Subject to Stripe's own cookie and privacy policies.",
            "Analytics providers: we may use services such as PostHog or similar privacy-focused analytics tools that set analytics cookies.",
            "CDN providers: may set cookies to deliver content efficiently and securely.",
          ]}
        />
        <LegalP>
          We do not control third-party cookies. Please refer to the respective
          third-party privacy and cookie policies for more information.
        </LegalP>
      </LegalSection>

      <LegalSection id="managing" title="4. Managing Cookies">
        <LegalP>
          You have the right to choose whether to accept or reject non-essential
          cookies. You can manage your preferences in the following ways:
        </LegalP>

        <h3 className="text-white font-medium mt-6 mb-2">
          4.1 Cookie Consent Tool
        </h3>
        <LegalP>
          When you first visit [APP_NAME], you will be presented with a cookie
          consent banner allowing you to accept or reject non-essential cookies.
          You can update your preferences at any time from the cookie settings
          link in the footer.
        </LegalP>

        <h3 className="text-white font-medium mt-6 mb-2">
          4.2 Browser Settings
        </h3>
        <LegalP>
          Most browsers allow you to control cookies through their settings.
          Note that disabling cookies may affect the functionality of the
          Service. Browser-specific instructions:
        </LegalP>
        <LegalList
          items={[
            "Chrome: Settings → Privacy and security → Cookies and other site data",
            "Firefox: Settings → Privacy & Security → Cookies and Site Data",
            "Safari: Preferences → Privacy → Manage Website Data",
            "Edge: Settings → Cookies and site permissions → Cookies and site data",
          ]}
        />

        <h3 className="text-white font-medium mt-6 mb-2">
          4.3 Opt-Out Links
        </h3>
        <LegalP>
          For analytics opt-outs, you may also visit:
        </LegalP>
        <LegalList
          items={[
            "Google Analytics opt-out: tools.google.com/dlpage/gaoptout",
            "Network Advertising Initiative: optout.networkadvertising.org",
          ]}
        />
      </LegalSection>

      <LegalSection id="do-not-track" title="5. Do Not Track">
        <LegalP>
          Some browsers include a &quot;Do Not Track&quot; (DNT) feature that
          sends a signal to websites requesting that your browsing activity not
          be tracked. Currently, there is no agreed-upon standard for how
          websites should respond to DNT signals.
        </LegalP>
        <LegalP>
          We honor DNT signals by not using analytics or marketing cookies when
          a valid DNT signal is detected, to the extent technically feasible.
          Strictly necessary cookies will still be set.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="6. Changes to This Policy">
        <LegalP>
          We may update this Cookie Policy to reflect changes in our practices
          or for other operational, legal, or regulatory reasons. When we make
          material changes, we will update the &quot;last updated&quot; date at
          the top of this page and, where appropriate, notify you via the
          Service or by email.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="7. Contact">
        <LegalP>
          If you have questions about our use of cookies or this Cookie Policy,
          please contact us:
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
