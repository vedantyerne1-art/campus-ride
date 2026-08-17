import React, { useState } from "react";
import { X, HelpCircle, Phone, Mail, FileQuestion, ChevronRight, ShieldCheck } from "lucide-react";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does verification work for drivers?",
      a: "All drivers must upload their University ID and clear a biometric selfie snapshot. Our campus safety team checks student/faculty records before approving driver mode.",
    },
    {
      q: "What happens if a driver deviates from the campus route?",
      a: "Our system runs real-time corridor monitoring. If the vehicle veers >150 meters off the official road, an automatic safety prompt alerts both the rider and the campus control room.",
    },
    {
      q: "How are fares calculated within the campus?",
      a: "Fares are calculated strictly based on university transport guidelines with capped flat rates for bikes, autos, and carpools with zero surge pricing.",
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">Help & Support</h3>
              <p className="apple-caption">Campus Desk & Safety Inquiries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Hotline Cards */}
        <div className="grid grid-cols-2 gap-2.5 my-4">
          <div className="p-3.5 rounded-[18px] liquid-glass-subtle text-left space-y-1">
            <Phone className="w-4 h-4 text-emerald-400" />
            <p className="font-bold text-xs text-white">Campus Helpline</p>
            <p className="text-[11px] font-mono text-white/60">1800-CAMPUS-99</p>
          </div>
          <div className="p-3.5 rounded-[18px] liquid-glass-subtle text-left space-y-1">
            <Mail className="w-4 h-4 text-indigo-400" />
            <p className="font-bold text-xs text-white">Safety Desk</p>
            <p className="text-[11px] font-mono text-white/60">safety@campus.edu</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Frequently Asked Questions</h4>
          {faqs.map((faq, i) => (
            <div
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="p-3.5 rounded-[16px] liquid-glass-subtle cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>{faq.q}</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-indigo-300 transition-transform ${
                    openFaq === i ? "rotate-90" : ""
                  }`}
                />
              </div>
              {openFaq === i && (
                <p className="text-[11px] text-white/70 mt-2 leading-relaxed pt-2 border-t border-white/10">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
