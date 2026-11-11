import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Registration T&Cs, effective 01 August 2026. Content lives here rather than
 * being fetched, since it gates account creation and must always be available
 * even if the frontend proxy/backend is briefly unreachable.
 */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Eligibility",
    body: "You must be at least 18 years old or have the consent of a parent or legal guardian. You agree that all registration information is true, accurate and complete and that you will keep it updated.",
  },
  {
    title: "2. Account Registration",
    body: "You are responsible for maintaining the confidentiality of your username and password. You are solely responsible for all activities carried out through your account. Notify FansBench immediately if you suspect unauthorised access.",
  },
  {
    title: "3. Acceptable Use",
    body: "You agree to use FansBench honestly, lawfully and respectfully. You shall not submit false information, impersonate others, interfere with platform operations, attempt to bypass security, use bots or automated scripts, upload malicious software or engage in unlawful conduct.",
  },
  {
    title: "4. Nominations",
    body: "When submitting nominations you warrant that the information is accurate, that you have the necessary rights to submit names, logos, photographs or other material and that the content does not infringe intellectual property or privacy rights.",
  },
  {
    title: "5. Fair Voting",
    body: "FansBench promotes transparent voting. Creating multiple accounts, using automation, buying unauthorised votes or manipulating competitions is prohibited. FansBench may investigate suspicious activity, invalidate votes, suspend accounts or permanently ban users involved in fraud.",
  },
  {
    title: "6. User Content",
    body: "You retain ownership of content you submit. You grant FansBench a worldwide, non-exclusive, royalty-free licence to host, reproduce, display, distribute and promote your content solely for operating, improving and promoting the platform. You remain responsible for your submissions.",
  },
  {
    title: "7. Community Standards",
    body: "Users must treat others respectfully. Harassment, bullying, hate speech, discriminatory content, explicit sexual material, scams, fraud, malware, privacy violations and unlawful content are prohibited.",
  },
  {
    title: "8. Payments",
    body: "Some services may require payment. Payments are processed by authorised providers. Unless expressly stated, completed purchases are non-refundable. Pricing may change.",
  },
  {
    title: "9. Privacy",
    body: "FansBench collects personal information necessary to create accounts, process nominations, voting, payments, prevent fraud, improve services and comply with legal obligations. Personal data is not sold. Users may exercise applicable privacy rights.",
  },
  {
    title: "10. Cookies and Security",
    body: "FansBench uses cookies and similar technologies to improve functionality, analyse usage and enhance security. Reasonable technical safeguards are implemented, although no system is completely secure.",
  },
  {
    title: "11. Account Enforcement",
    body: "FansBench may remove content, disqualify votes, suspend or terminate accounts that violate these Terms, the Community Guidelines or applicable laws.",
  },
  {
    title: "12. Platform Availability",
    body: 'Services are provided on an "as is" and "as available" basis. FansBench does not guarantee uninterrupted operation or specific competition outcomes.',
  },
  {
    title: "13. Limitation of Liability",
    body: "To the fullest extent permitted by law, FansBench is not liable for indirect, incidental or consequential losses arising from use of the platform.",
  },
  {
    title: "14. Changes",
    body: "FansBench may amend these Terms from time to time. Continued use after publication of revised Terms constitutes acceptance.",
  },
  {
    title: "15. User Acknowledgement",
    body: "Before creating an account, you acknowledge and agree that: you have read and understood these Terms and Conditions; you agree to the FansBench Terms of Use, Privacy Policy and Community Guidelines; you consent to the collection and processing of your personal information as described; you understand that fraudulent voting or misuse of the platform may result in vote disqualification, account suspension or permanent termination; you understand that FansBench may investigate suspicious activity to protect competition integrity; you accept responsibility for all activity conducted through your account; and you understand that your continued use of FansBench constitutes acceptance of future updates to these Terms.",
  },
];

const SCROLL_END_THRESHOLD_PX = 24;

export function TermsDialog({
  open,
  onOpenChange,
  onAgree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
}) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_END_THRESHOLD_PX;
    if (atEnd) setReachedEnd(true);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset so re-opening after a scroll-up-then-close requires scrolling again.
      setReachedEnd(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>FansBench Registration Terms and Conditions</DialogTitle>
          <DialogDescription>
            Effective 01 August 2026. Scroll to the bottom to enable the agree button.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-md border border-border bg-surface-muted p-4 text-sm"
        >
          <p className="text-muted-foreground">
            Welcome to FansBench, a digital platform that enables fans and communities to
            nominate, recognise, celebrate and support outstanding individuals, brands,
            businesses, organisations, schools, creators, sports teams and community
            initiatives through transparent public participation.
          </p>
          <p className="text-muted-foreground">
            These Registration Terms and Conditions govern the creation and use of your
            FansBench account. They should be read together with the FansBench Terms of Use,
            Privacy Policy and Community Guidelines. By clicking &ldquo;I Agree&rdquo;,
            creating an account or using any FansBench service, you acknowledge that you have
            read, understood and accepted all of these documents.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <p className="mt-1 text-muted-foreground">{section.body}</p>
            </div>
          ))}

          <div className="rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Contact</p>
            <p>General Support: support@fansbench.com</p>
            <p>Privacy: privacy@fansbench.com</p>
          </div>

          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            {reachedEnd && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            {reachedEnd
              ? "You've reached the end — you can now agree."
              : "— end of document —"}
          </p>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reachedEnd}
            onClick={() => {
              onAgree();
              onOpenChange(false);
            }}
            className="btn-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            I Agree
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
