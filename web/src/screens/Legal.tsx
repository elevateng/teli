import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/ui';

const UPDATED = 'June 2026';

export default function Legal() {
  const { doc } = useParams();
  const nav = useNavigate();
  const isPrivacy = doc === 'privacy';
  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'} onBack={() => nav(-1)} />
      <div className="px-5 py-5 max-w-[760px] mx-auto w-full">
        <p className="text-xs text-sub mb-5">Last updated: {UPDATED}</p>
        <div className="prose-legal space-y-5 text-[15px] leading-relaxed text-navy">
          {isPrivacy ? <Privacy /> : <Terms />}
        </div>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-extrabold text-navy mt-2">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sub leading-relaxed">{children}</p>;
}

function Terms() {
  return (
    <>
      <P>Welcome to TELI — The Elevate Learning Institute, an initiative of Elevate Development Foundation (“TELI”, “we”, “us”). These Terms &amp; Conditions govern your use of the TELI platform and services. By creating an account or using TELI, you agree to these terms.</P>
      <H>1. Eligibility &amp; accounts</H>
      <P>You must provide accurate information when creating an account and keep it up to date. You are responsible for activity under your account and for keeping your password secure. You must be at least 16 years old, or have the consent of a parent or guardian.</P>
      <H>2. Use of the platform</H>
      <P>TELI grants you a personal, non-transferable licence to access courses and content you are enrolled in, for your own learning. You agree not to share your account, redistribute course materials, attempt to disrupt the service, or use it for any unlawful purpose.</P>
      <H>3. Payments &amp; refunds</H>
      <P>Some courses are paid. Prices are shown in Nigerian Naira (₦) and processed by our payment partners. Where a course offers a money-back guarantee, the terms shown on the course at purchase apply. Discount codes are single-use unless stated otherwise and cannot be exchanged for cash.</P>
      <H>4. Certificates</H>
      <P>Certificates of completion are issued when a course’s completion conditions are met. They recognise participation and completion and do not constitute an accredited academic qualification unless expressly stated.</P>
      <H>5. Community conduct</H>
      <P>In community spaces, team chats and messages you agree to be respectful and not to post unlawful, harassing, hateful or infringing content. We may moderate, remove content or suspend accounts that breach these standards.</P>
      <H>6. Intellectual property</H>
      <P>All course content, the TELI brand and the platform are owned by Elevate Development Foundation or its licensors and are protected by law. You may not copy or reuse them without permission.</P>
      <H>7. Changes &amp; termination</H>
      <P>We may update the platform, courses or these terms from time to time. We may suspend or terminate access for breach of these terms. You may close your account at any time.</P>
      <H>8. Disclaimer &amp; liability</H>
      <P>The platform is provided “as is”. To the extent permitted by law, TELI is not liable for indirect or consequential losses arising from use of the service.</P>
      <H>9. Contact</H>
      <P>Questions about these terms? Email us at <a className="text-brand font-semibold" href="mailto:teli@elevateng.org">teli@elevateng.org</a>.</P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <P>This Privacy Policy explains how TELI — The Elevate Learning Institute, an initiative of Elevate Development Foundation, collects and uses your personal information.</P>
      <H>1. Information we collect</H>
      <P>Account details (name, email, profile photo), learning activity (courses, progress, quiz and assignment results), payments you make, and content you post in communities, team chats and messages. We also collect basic technical data needed to run the service.</P>
      <H>2. How we use it</H>
      <P>To provide your courses and certificates, track progress and streaks, enable community and messaging features, process payments, send you important notifications and emails, and improve the platform.</P>
      <H>3. Sharing</H>
      <P>We share data with service providers who help us operate (e.g. hosting, email and payment partners) under appropriate safeguards. Course instructors and admins can see your participation and submissions within their courses. We do not sell your personal data.</P>
      <H>4. Your choices &amp; rights</H>
      <P>You can view and update your profile and email in Settings, and request deletion of your account by contacting us. You may opt out of non-essential emails.</P>
      <H>5. Data security &amp; retention</H>
      <P>We use reasonable measures to protect your data and retain it for as long as your account is active or as needed to provide the service and meet legal obligations.</P>
      <H>6. Cookies &amp; local storage</H>
      <P>We use local storage to keep you signed in and remember preferences such as your theme. We do not use advertising trackers.</P>
      <H>7. Contact</H>
      <P>For privacy questions or requests, email <a className="text-brand font-semibold" href="mailto:teli@elevateng.org">teli@elevateng.org</a>.</P>
    </>
  );
}
