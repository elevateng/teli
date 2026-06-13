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
        <p className="text-xs text-sub mb-1">Last updated: {UPDATED}</p>
        <p className="text-xs text-sub mb-5">TELI — The Elevate Learning Institute, an initiative of Elevate Development Foundation (“TELI”, “we”, “us”, “our”).</p>
        <div className="space-y-1 text-[15px] leading-relaxed text-navy">
          {isPrivacy ? <Privacy /> : <Terms />}
        </div>
      </div>
    </div>
  );
}

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return <h2 className="text-[17px] font-extrabold text-navy mt-6 mb-1.5">{n}. {children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sub leading-relaxed mb-2">{children}</p>;
}
function UL({ items }: { items: React.ReactNode[] }) {
  return <ul className="list-disc pl-5 text-sub space-y-1 mb-2">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
}
function Mail() { return <a className="text-brand font-semibold" href="mailto:teli@elevateng.org">teli@elevateng.org</a>; }

function Terms() {
  return (
    <>
      <P>These Terms &amp; Conditions (“Terms”) form a binding agreement between you and TELI and govern your access to and use of the TELI platform, website, mobile/installable app, courses, communities, messaging and related services (together, the “Service”). By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Service.</P>

      <H n="1">Definitions</H>
      <UL items={[
        <><b>“Content”</b> means courses, lessons, videos, text, materials, quizzes, assignments and other materials made available on the Service.</>,
        <><b>“Learner”</b> means a user who accesses courses; <b>“Admin”/“Instructor”</b> and <b>“Super Admin”</b> are staff who create or manage courses and the platform.</>,
        <><b>“User Content”</b> means anything you post or submit — e.g. profile details, community posts, team chat messages, reviews and assignment submissions.</>,
      ]} />

      <H n="2">Eligibility &amp; accounts</H>
      <P>You must be at least 16 years old, or have the consent of a parent or guardian, to use the Service. You agree to provide accurate, current information and to keep it up to date. You are responsible for all activity under your account and for keeping your password confidential. Notify us promptly of any unauthorised use. Accounts are personal and may not be shared or transferred.</P>

      <H n="3">Enrolment, access &amp; licence</H>
      <P>When you enrol in a course (free or paid), we grant you a limited, personal, non-exclusive, non-transferable, revocable licence to access and view that Content for your own learning for as long as your account and the course remain available. Some courses are private and require an invitation or access code.</P>

      <H n="4">Fees &amp; payment</H>
      <P>Prices are shown in Nigerian Naira (₦) and are processed by our third-party payment partners; we do not store full card details. By purchasing, you authorise the applicable charge. Except where otherwise stated in writing or required by applicable law, payments are final. Discount and referral codes are single-use unless stated otherwise, have no cash value, and may be withdrawn or expire.</P>

      <H n="5">Your content &amp; conduct</H>
      <P>You retain ownership of your User Content. By posting it, you grant TELI a worldwide, royalty-free licence to host, store, display and use it as needed to operate and improve the Service. You are responsible for your User Content and confirm you have the rights to share it. You agree not to:</P>
      <UL items={[
        'post unlawful, harassing, hateful, defamatory, obscene or infringing content;',
        'impersonate others, spam, or share another person’s private information without consent;',
        'copy, record, resell, sublicense or publicly distribute course Content;',
        'attempt to disrupt, reverse-engineer, scrape or gain unauthorised access to the Service;',
        'cheat on quizzes/assignments or misrepresent achievements.',
      ]} />

      <H n="6">Communities, teams &amp; messaging</H>
      <P>Community spaces, team study chats and direct messages are provided to support learning. Be respectful and professional. We may moderate, edit or remove content and suspend or remove users who breach these Terms. Messaging is intended for learning-related communication only; do not use it to send spam or unsolicited promotions.</P>

      <H n="7">Certificates</H>
      <P>Certificates of completion are issued when a course’s completion conditions are met and recognise participation and completion. Unless expressly stated, they are not an accredited academic or professional qualification. We may revoke a certificate obtained through fraud or breach of these Terms.</P>

      <H n="8">Intellectual property</H>
      <P>The Service, the TELI name and logo, and all Content (other than your User Content) are owned by Elevate Development Foundation or its licensors and are protected by intellectual-property laws. Except for the licence granted above, no rights are transferred to you.</P>

      <H n="9">Third-party services &amp; links</H>
      <P>The Service relies on third-party providers (e.g. hosting, payments, email, sign-in and embedded media) and may link to third-party sites. We are not responsible for third-party content or practices; your use of them is governed by their terms.</P>

      <H n="10">Disclaimers</H>
      <P>The Service and Content are provided “as is” and “as available”, without warranties of any kind, whether express or implied, including fitness for a particular purpose. We do not guarantee that the Service will be uninterrupted, error-free or that learning outcomes will be achieved.</P>

      <H n="11">Limitation of liability</H>
      <P>To the maximum extent permitted by law, TELI and Elevate Development Foundation will not be liable for any indirect, incidental, special or consequential losses, or loss of data, revenue or goodwill, arising from your use of the Service. Our total liability for any claim is limited to the amount you paid us for the relevant course in the 12 months before the claim.</P>

      <H n="12">Indemnity</H>
      <P>You agree to indemnify and hold TELI and Elevate Development Foundation harmless from claims and costs arising from your User Content, your use of the Service, or your breach of these Terms or applicable law.</P>

      <H n="13">Suspension &amp; termination</H>
      <P>We may suspend or terminate your access if you breach these Terms or to protect the Service or other users. You may stop using the Service and request account deletion at any time by contacting us. Provisions that by their nature should survive termination (e.g. IP, disclaimers, liability) will survive.</P>

      <H n="14">Changes</H>
      <P>We may update the Service and these Terms from time to time. Material changes will be notified through the Service or by email. Continued use after changes take effect means you accept the updated Terms.</P>

      <H n="15">Governing law</H>
      <P>These Terms are governed by the laws of the Federal Republic of Nigeria, and disputes are subject to the courts of Nigeria, without prejudice to any mandatory consumer-protection rights you may have.</P>

      <H n="16">Contact</H>
      <P>Questions about these Terms? Email <Mail />.</P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <P>This Privacy Policy explains how TELI — The Elevate Learning Institute, an initiative of Elevate Development Foundation, collects, uses, shares and protects your personal data when you use the Service. We process personal data in line with the Nigeria Data Protection Act 2023 (NDPA) and good international practice. Elevate Development Foundation is the data controller.</P>

      <H n="1">Information we collect</H>
      <P><b>Information you provide:</b></P>
      <UL items={[
        'Account details — name, email address, password and (optionally) profile photo and tagline.',
        'Content you submit — community posts, team chat messages, direct messages, course reviews, notes and assignment submissions (including any files you upload).',
        'Support and communications you send us.',
      ]} />
      <P><b>Information collected automatically:</b></P>
      <UL items={[
        'Learning activity — enrolments, lesson/course progress, streaks, points, quiz and assignment results, certificates.',
        'Limited technical data needed to operate the Service (e.g. device/browser information) and local storage used to keep you signed in and remember preferences such as your theme.',
      ]} />
      <P><b>From third parties:</b> if you sign in with Google, we receive basic profile information (name, email) from Google. Payments are handled by our payment partners, who share transaction status with us; we do not receive your full card details.</P>

      <H n="2">How we use your information</H>
      <UL items={[
        'to provide your courses, certificates, progress tracking, streaks and achievements;',
        'to enable communities, team study groups and messaging;',
        'to process payments, discounts and referral rewards;',
        'to send important service notifications and, where relevant, emails;',
        'to provide support, maintain security, prevent abuse and meet legal obligations;',
        'to understand usage and improve the Service.',
      ]} />

      <H n="3">Legal basis for processing</H>
      <P>We process your data on the bases permitted by the NDPA, including: performance of our contract with you (to deliver the Service), your consent (e.g. optional communications), our legitimate interests (to secure and improve the Service), and compliance with legal obligations.</P>

      <H n="4">Sharing &amp; disclosure</H>
      <P>We do not sell your personal data. We share it only as needed:</P>
      <UL items={[
        'with service providers (processors) who host the platform, send email, process payments and provide sign-in, under contracts that require appropriate safeguards;',
        'with course instructors and admins, who can see your participation, submissions and messages within their courses and teams;',
        'where required by law, regulation or to protect rights, safety and the integrity of the Service;',
        'in connection with a reorganisation of Elevate Development Foundation, subject to this Policy.',
      ]} />

      <H n="5">Cookies &amp; local storage</H>
      <P>We use local storage and similar technologies to keep you signed in and remember preferences (such as light/dark theme and whether you’ve installed the app). We do not use third-party advertising trackers.</P>

      <H n="6">Data retention</H>
      <P>We keep your personal data for as long as your account is active and as needed to provide the Service. Where you delete your account, we delete or anonymise your personal data within a reasonable period, except where we must retain certain records (e.g. transaction records) to meet legal, accounting or security obligations.</P>

      <H n="7">Data security</H>
      <P>We use reasonable technical and organisational measures to protect your data, including encrypted connections and hashed passwords. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</P>

      <H n="8">International transfers</H>
      <P>Some of our providers may process data outside Nigeria. Where this happens, we take steps to ensure your data receives an adequate level of protection consistent with the NDPA.</P>

      <H n="9">Your rights</H>
      <P>Subject to the NDPA, you have the right to access your data, request correction or deletion, object to or restrict certain processing, request portability, and withdraw consent at any time. You can update your name, email and profile in Settings, or contact us to exercise other rights. You also have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC).</P>

      <H n="10">Children’s privacy</H>
      <P>The Service is not directed to children under 16. If we learn we have collected data from a child without appropriate consent, we will delete it.</P>

      <H n="11">Changes to this Policy</H>
      <P>We may update this Policy from time to time. Material changes will be notified through the Service or by email, and the “last updated” date above will change.</P>

      <H n="12">Contact</H>
      <P>For privacy questions or to exercise your rights, contact our team at <Mail />.</P>
    </>
  );
}
