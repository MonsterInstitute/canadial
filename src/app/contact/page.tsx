import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/Prose";
import TrustForm from "@/components/TrustForm";
import { sendContact } from "@/app/trust-actions";

export const metadata: Metadata = { title: "Contact", description: "Contact Canadial: questions, corrections and press.", alternates: { canonical: "/contact" } };

export default function Contact() {
  return (
    <Prose title="Contact">
      <p>Questions, corrections or press enquiries: send a message and we&apos;ll reply by email. If a number belongs to you and you think its page is wrong, use the <Link href="/removal">number removal request</Link> instead.</p>
      <p>To report a scam to the authorities, contact the <a href="https://antifraudcentre-centreantifraude.ca/" rel="noopener noreferrer" target="_blank">Canadian Anti-Fraud Centre</a>; Canadial can&apos;t act on fraud reports.</p>
      <div className="mt-6">
        <TrustForm
          action={sendContact}
          submit="Send message"
          fields={[
            { name: "name", label: "Your name (optional)" },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "message", label: "Message", type: "textarea", required: true },
          ]}
        />
      </div>
    </Prose>
  );
}
