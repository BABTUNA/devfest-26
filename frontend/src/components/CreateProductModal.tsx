'use client';

import { useState } from 'react';
import { X, Loader2, PackagePlus, DollarSign } from 'lucide-react';

interface CreateProductModalProps {
    onClose: () => void;
    onSuccess: (product: { name: string; slug: string }) => void;
}

export function CreateProductModal({ onClose, onSuccess }: CreateProductModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('5.00');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const priceInCents = Math.round(parseFloat(price) * 100);

            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    slug,
                    description,
                    priceInCents,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create product');
            }

            onSuccess(data.product);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')) {
            setSlug(newName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-app bg-app-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-app p-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-app-fg">
                        <PackagePlus className="h-5 w-5 text-blue-400" />
                        Create New Agent
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-app-fg">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={handleNameChange}
                                placeholder="e.g. Resume Optimizer"
                                className="w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-app-fg">
                                Slug <span className="text-app-soft font-normal">(unique identifier)</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
                                placeholder="e.g. resume_optimizer"
                                className="w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-blue-300 font-mono focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-app-fg">Description</label>
                            <textarea
                                required
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this agent do?"
                                className="w-full resize-none rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-app-fg">Price (USD)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-4 w-4 text-app-soft" />
                                </div>
                                <input
                                    type="number"
                                    required
                                    min="0.50"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full rounded-lg border border-app bg-app pl-9 pr-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <p className="mt-1 text-xs text-app-soft">Minimum $0.50</p>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-app-soft hover:text-app-fg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Agent
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
