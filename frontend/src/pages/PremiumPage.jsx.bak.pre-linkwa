import React, { useState } from "react";
import PaymentModal from "../components/PaymentModal";
import { Crown, Send, Rocket } from "lucide-react";

export default function PremiumPage() {
  const [activePlan, setActivePlan] = useState(null);

  const cards = [
    { key: "push_cv",         title: "Push CV",           price: 5,  icon: Send,   desc: "Send your CV to one company instantly.",        cta: "Push CV" },
    { key: "premium_monthly", title: "Premium - Monthly", price: 5,  icon: Crown,  desc: "Verified badge, profile views, premium badge.", cta: "Go Premium" },
    { key: "premium_yearly",  title: "Premium - Yearly",  price: 45, icon: Crown,  desc: "Same as monthly, save 25%.",                     cta: "Save 25%" },
    { key: "boost_20k",       title: "Boost Post - 20K",  price: 2,  icon: Rocket, desc: "20,000 reach for one of your posts.",            cta: "Boost 20K" },
    { key: "boost_80k",       title: "Boost Post - 80K",  price: 5,  icon: Rocket, desc: "80,000 reach - best value.",                     cta: "Boost 80K" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 text-white">
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        Upgrade Omnixra
      </h1>
      <p className="text-white/60 mb-6">Pay with EcoCash, InnBucks, or OneMoney. USD only.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className="text-indigo-400" />
                <h3 className="font-semibold">{c.title}</h3>
              </div>
              <div className="text-2xl font-bold mb-2">${c.price}</div>
              <p className="text-sm text-white/60 flex-1">{c.desc}</p>
              <button
                onClick={() => setActivePlan(c.key)}
                className="mt-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 font-medium"
              >
                {c.cta}
              </button>
            </div>
          );
        })}
      </div>

      {activePlan && (
        <PaymentModal
          planKey={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => setActivePlan(null)}
        />
      )}
    </div>
  );
}
