import Link from 'next/link';
import { ArrowRight, Sparkles, Lock, CreditCard } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 md:px-6 md:py-14">
      <section className="grid gap-6 rounded-2xl border border-app bg-app-surface/70 p-6 shadow-xl backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-8">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Entitlement-driven AI tools
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-app-fg md:text-5xl">
            Discover, unlock, and run modular AI blocks.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-app-soft md:text-lg">
            Browse the block catalog, run tools instantly, and manage Flowglad checkout, subscriptions, and invoices from one interface.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Open Marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/lab"
              className="inline-flex items-center gap-2 rounded-lg border border-app px-4 py-2.5 text-sm font-medium text-app-fg transition hover:bg-app-surface"
            >
              Open Lab
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl border border-app bg-app-card/80 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-app-soft">Aha moment</p>
            <p className="text-sm text-app-fg">In demo mode, blocks are unlocked and ready to run immediately.</p>
          </div>
          <div className="rounded-xl border border-app bg-app-card/80 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-app-soft">
              <Lock className="h-3.5 w-3.5" />
              Entitlements
            </p>
            <p className="text-sm text-app-fg">Locked blocks clearly show unlock actions and purchase pathways.</p>
          </div>
          <div className="rounded-xl border border-app bg-app-card/80 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-app-soft">
              <CreditCard className="h-3.5 w-3.5" />
              Flowglad surfaces
            </p>
            <p className="text-sm text-app-fg">Checkout, subscriptions, invoices, and billing portal access are integrated.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
