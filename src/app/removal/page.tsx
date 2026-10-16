import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/Prose";
import TrustForm from "@/components/TrustForm";
import { requestRemoval } from "@/app/trust-actions";

export const metadata: Metadata = { title: "Number removal request", description: "Ask Canadial to review the page for a phone number that belongs to you or your business.", alternates: { canonical: "/removal" } };

export default function Removal() {
  return (
    <Prose title="Number removal request">
      <p>If a phone number belongs to you or your business and you think its page is wrong or unfair, tell us here. We review every request and reply by email.</p>
      <h2>What we can and can&apos;t change</h2>
      <ul>
        <li><strong>Community reports</strong> that contain personal information, abuse or false claims are hidden.</li>
        <li><strong>FTC complaint counts</strong> come from public U.S. government data and stay listed. Scam callers often fake caller IDs, so complaints don&apos;t prove the number&apos;s owner made the calls; if a number was spoofed or recently changed hands, we can add a note saying so.</li>
        <li><strong>Numbering records</strong> (who a block is assigned to) come from the official numbering administrators.</li>
      </ul>
      <p>See <Link href="/methodology">how pages are built</Link>.</p>
      <div className="mt-6">
        <TrustForm
          action={requestRemoval}
          submit="Send request"
          fields={[
            { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "416-555-0123" },
            { name: "name", label: "Your name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "relationship", label: "Your connection to the number", type: "select", options: ["It's my personal number", "It's my business's number", "I represent the owner", "Other"] },
            { name: "reason", label: "What's wrong with the page?", type: "textarea", required: true },
          ]}
        />
      </div>
    </Prose>
  );
}
