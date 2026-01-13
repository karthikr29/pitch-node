import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | PitchNode",
    description: "Privacy Policy for PitchNode - Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background-primary">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors mb-8"
                >
                    <span>←</span>
                    <span>Back to Home</span>
                </Link>

                {/* Header */}
                <h1 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
                    Privacy Policy
                </h1>
                <p className="text-text-muted mb-12">
                    Last updated: January 2025
                </p>

                {/* Content */}
                <div className="prose prose-lg max-w-none text-text-secondary space-y-8">
                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            1. Introduction
                        </h2>
                        <p>
                            Welcome to PitchNode (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your
                            privacy and personal information. This Privacy Policy explains how we collect, use,
                            disclose, and safeguard your information when you visit our website and use our
                            AI-powered sales training platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            2. Information We Collect
                        </h2>
                        <h3 className="font-semibold text-text-primary mt-6 mb-3">
                            Personal Information
                        </h3>
                        <p>When you join our waitlist or use our services, we may collect:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Name</li>
                            <li>Email address</li>
                            <li>Job title/role</li>
                            <li>Company name (if provided)</li>
                        </ul>

                        <h3 className="font-semibold text-text-primary mt-6 mb-3">
                            Usage Information
                        </h3>
                        <p>We automatically collect certain information when you visit our website:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Browser type and version</li>
                            <li>Device information</li>
                            <li>IP address</li>
                            <li>Pages visited and time spent</li>
                            <li>Referring website</li>
                        </ul>

                        <h3 className="font-semibold text-text-primary mt-6 mb-3">
                            Voice and Conversation Data
                        </h3>
                        <p>
                            When you use our AI sales training features (upon launch), we may collect and process
                            voice recordings and conversation transcripts to provide personalized feedback and
                            improve your sales skills. This data is processed securely and used solely for
                            training and improvement purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            3. How We Use Your Information
                        </h2>
                        <p>We use the information we collect to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Provide and maintain our services</li>
                            <li>Process your waitlist registration</li>
                            <li>Send you updates about our product launch and features</li>
                            <li>Provide AI-powered sales training and feedback</li>
                            <li>Analyze and improve our services</li>
                            <li>Respond to your inquiries and support requests</li>
                            <li>Detect and prevent fraud or abuse</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            4. Data Sharing and Disclosure
                        </h2>
                        <p>
                            We do not sell your personal information. We may share your information with:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>
                                <strong>Service Providers:</strong> Third-party vendors who help us operate our
                                platform (e.g., hosting, analytics, email services)
                            </li>
                            <li>
                                <strong>Legal Requirements:</strong> When required by law or to protect our rights
                            </li>
                            <li>
                                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                                sale of assets
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            5. Data Security
                        </h2>
                        <p>
                            We implement appropriate technical and organizational measures to protect your
                            personal information against unauthorized access, alteration, disclosure, or
                            destruction. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            6. Your Rights
                        </h2>
                        <p>Depending on your location, you may have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Access the personal information we hold about you</li>
                            <li>Request correction of inaccurate information</li>
                            <li>Request deletion of your personal information</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Data portability</li>
                        </ul>
                        <p className="mt-4">
                            To exercise these rights, please contact us at{" "}
                            <a href="mailto:hello@pitchnode.com" className="text-primary hover:underline">
                                hello@pitchnode.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            7. Cookies and Tracking
                        </h2>
                        <p>
                            We use cookies and similar tracking technologies to enhance your experience.
                            You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            8. Third-Party Links
                        </h2>
                        <p>
                            Our website may contain links to third-party websites. We are not responsible
                            for the privacy practices of these external sites.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            9. Children&apos;s Privacy
                        </h2>
                        <p>
                            Our services are not intended for individuals under 18 years of age. We do not
                            knowingly collect personal information from children.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            10. Changes to This Policy
                        </h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any
                            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            11. Contact Us
                        </h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="mt-3">
                            <strong>Email:</strong>{" "}
                            <a href="mailto:hello@pitchnode.com" className="text-primary hover:underline">
                                hello@pitchnode.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
