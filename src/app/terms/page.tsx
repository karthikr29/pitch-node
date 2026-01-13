import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service | PitchNode",
    description: "Terms of Service for PitchNode - Read our terms and conditions for using our AI-powered sales training platform.",
};

export default function TermsOfService() {
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
                    Terms of Service
                </h1>
                <p className="text-text-muted mb-12">
                    Last updated: January 2025
                </p>

                {/* Content */}
                <div className="prose prose-lg max-w-none text-text-secondary space-y-8">
                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            1. Acceptance of Terms
                        </h2>
                        <p>
                            By accessing or using PitchNode (&quot;the Service&quot;), you agree to be bound by these
                            Terms of Service. If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            2. Description of Service
                        </h2>
                        <p>
                            PitchNode is an AI-powered sales training platform that enables users to practice
                            sales calls, pitches, and negotiations through realistic AI simulations. Our Service
                            provides:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>AI-powered sales roleplay scenarios</li>
                            <li>Real-time voice conversation practice</li>
                            <li>Performance analytics and feedback</li>
                            <li>Progress tracking and skill development</li>
                            <li>Multiple AI personas with varying difficulty levels</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            3. User Accounts
                        </h2>
                        <p>
                            To access certain features, you may be required to create an account. You agree to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Provide accurate and complete information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Accept responsibility for all activities under your account</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            4. Waitlist and Early Access
                        </h2>
                        <p>
                            By joining our waitlist, you agree to receive communications about our product
                            launch, features, and updates. You can unsubscribe at any time. Waitlist
                            registration does not guarantee access to the Service upon launch.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            5. Acceptable Use
                        </h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Use the Service for any illegal or unauthorized purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Upload malicious code or content</li>
                            <li>Harass, abuse, or harm others through the Service</li>
                            <li>Use the Service to train competing AI systems</li>
                            <li>Resell or redistribute the Service without authorization</li>
                            <li>Use automated tools to scrape or collect data from the Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            6. Intellectual Property
                        </h2>
                        <p>
                            The Service, including all content, features, and functionality, is owned by
                            PitchNode and protected by intellectual property laws. You may not copy, modify,
                            distribute, or create derivative works without our written permission.
                        </p>
                        <p className="mt-4">
                            You retain ownership of any content you create during practice sessions. However,
                            you grant us a license to use anonymized data to improve our AI and Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            7. Voice and Conversation Data
                        </h2>
                        <p>
                            By using our AI training features, you consent to the recording and processing of
                            voice conversations for the purpose of providing feedback and improving your skills.
                            Please refer to our Privacy Policy for details on how we handle this data.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            8. Payment and Subscriptions
                        </h2>
                        <p>
                            Certain features may require a paid subscription. Payment terms, pricing, and
                            billing cycles will be disclosed at the time of purchase. All fees are
                            non-refundable unless otherwise stated.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            9. Disclaimer of Warranties
                        </h2>
                        <p>
                            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
                            We do not guarantee that:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>The Service will be uninterrupted or error-free</li>
                            <li>Results from using the Service will be accurate or reliable</li>
                            <li>The AI feedback will guarantee sales success</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            10. Limitation of Liability
                        </h2>
                        <p>
                            To the maximum extent permitted by law, PitchNode shall not be liable for any
                            indirect, incidental, special, consequential, or punitive damages arising from
                            your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            11. Indemnification
                        </h2>
                        <p>
                            You agree to indemnify and hold harmless PitchNode and its officers, directors,
                            employees, and agents from any claims, damages, or expenses arising from your
                            use of the Service or violation of these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            12. Termination
                        </h2>
                        <p>
                            We may terminate or suspend your access to the Service at any time, with or without
                            cause, and with or without notice. Upon termination, your right to use the Service
                            will cease immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            13. Changes to Terms
                        </h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will notify you of
                            significant changes by posting a notice on our website or sending an email.
                            Continued use of the Service after changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            14. Governing Law
                        </h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with applicable laws,
                            without regard to conflict of law principles.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                            15. Contact Us
                        </h2>
                        <p>
                            If you have any questions about these Terms, please contact us at:
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
