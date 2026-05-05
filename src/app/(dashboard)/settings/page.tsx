"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Check,
  CreditCard,
  Loader2,
  Lock,
  Moon,
  Monitor,
  Palette,
  Save,
  Shield,
  Sun,
  Trash2,
  User,
  Zap,
} from "lucide-react";

type SettingsSection = "personal" | "security" | "plan";

const sections: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal Details", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "plan", label: "Plan & Upgrade", icon: CreditCard },
];

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "self_describe", label: "Self-describe" },
];

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getInitialSection(): SettingsSection {
  if (typeof window === "undefined") return "personal";
  const section = new URLSearchParams(window.location.search).get("section");
  return section === "security" || section === "plan" ? section : "personal";
}

export default function SettingsPage() {
  const { user, userProfile, userPlan, planError, refreshProfile, refreshPlan } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("personal");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const displayName =
    userProfile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const avatarUrl =
    userProfile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;
  const email = userProfile?.email || user?.email || "";
  const provider = typeof user?.app_metadata?.provider === "string"
    ? user.app_metadata.provider
    : null;
  const isOAuthUser = provider && provider !== "email";

  const [profileForm, setProfileForm] = useState({
    fullName: displayName,
    age: "",
    gender: "",
    phone: "",
    company: "",
    jobTitle: "",
    country: "",
    timezone: "",
  });

  useEffect(() => {
    setMounted(true);
    setActiveSection(getInitialSection());
  }, []);

  useEffect(() => {
    setProfileForm({
      fullName: displayName,
      age: userProfile?.age ? String(userProfile.age) : "",
      gender: userProfile?.gender ?? "",
      phone: userProfile?.phone ?? "",
      company: userProfile?.company ?? "",
      jobTitle: userProfile?.jobTitle ?? "",
      country: userProfile?.country ?? "",
      timezone: userProfile?.timezone ?? "",
    });
  }, [displayName, userProfile]);

  function setSection(section: SettingsSection) {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", section);
      window.history.replaceState(null, "", url.toString());
    }
  }

  function updateProfileField(field: keyof typeof profileForm, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProfileSave() {
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileForm.fullName,
          age: profileForm.age,
          gender: profileForm.gender,
          phone: profileForm.phone,
          company: profileForm.company,
          job_title: profileForm.jobTitle,
          country: profileForm.country,
          timezone: profileForm.timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setProfileError(data?.error ?? "Failed to update profile");
        return;
      }

      await refreshProfile();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError("Something went wrong");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => null);
        setPasswordError(data?.error || "Failed to update password");
      }
    } catch {
      setPasswordError("Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Failed to delete account. Please try again.");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const creditsLimit = userPlan?.creditsLimit ?? null;
  const creditsRemaining = userPlan?.creditsRemaining ?? null;
  const creditsUsed = creditsLimit !== null && creditsRemaining !== null
    ? Math.max(0, creditsLimit - creditsRemaining)
    : null;
  const planName = userPlan?.type === "pro" ? "Performer" : "Warm Up";
  const creditLabel = userPlan?.creditsScope === "monthly"
    ? "Monthly credits"
    : "Lifetime credits";
  const usagePercent = creditsLimit && creditsUsed !== null
    ? Math.min(100, (creditsUsed / creditsLimit) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, security, and plan details.</p>
      </div>

      <div className="flex gap-6">
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {sections.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="md:hidden grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSection(section.id)}
                className={cn(
                  "rounded-md px-2 py-2 text-xs font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {section.label.replace(" Details", "").replace(" & Upgrade", "")}
              </button>
            ))}
          </div>

          {activeSection === "personal" && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Personal Details
                  </CardTitle>
                  <CardDescription>Update the profile information used inside ConvoSparr.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar size="lg" className="w-16 h-16">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                      <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{displayName}</p>
                      <p className="text-sm text-muted-foreground">{email}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        value={profileForm.fullName}
                        onChange={(e) => updateProfileField("fullName", e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={email} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        min={18}
                        max={120}
                        value={profileForm.age}
                        onChange={(e) => updateProfileField("age", e.target.value)}
                        placeholder="Age"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={profileForm.gender}
                        onChange={(e) => updateProfileField("gender", e.target.value)}
                        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                      >
                        {genderOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => updateProfileField("phone", e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={profileForm.company}
                        onChange={(e) => updateProfileField("company", e.target.value)}
                        placeholder="Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job title</Label>
                      <Input
                        id="jobTitle"
                        value={profileForm.jobTitle}
                        onChange={(e) => updateProfileField("jobTitle", e.target.value)}
                        placeholder="Job title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={profileForm.country}
                        onChange={(e) => updateProfileField("country", e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={profileForm.timezone}
                        onChange={(e) => updateProfileField("timezone", e.target.value)}
                        placeholder="e.g. Asia/Kolkata"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                      {profileError}
                    </p>
                  )}

                  <Button onClick={handleProfileSave} disabled={profileLoading}>
                    {profileLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profileSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Choose your preferred theme.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {themeOptions.map((opt) => {
                      const isActive = mounted && theme === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer",
                            isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          )}
                        >
                          <opt.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Delete Account
                  </CardTitle>
                  <CardDescription>Irreversibly remove your account and app data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                          This will permanently delete your profile and account access.
                        </DialogDescription>
                      </DialogHeader>
                      {deleteError && (
                        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                          {deleteError}
                        </p>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
                          {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Account"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Security
                </CardTitle>
                <CardDescription>Manage your password.</CardDescription>
              </CardHeader>
              <CardContent>
                {isOAuthUser && (
                  <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    This account signs in with {provider}. Password changes may be managed by your identity provider unless you set a password for this email.
                  </p>
                )}
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
                      Password updated successfully.
                    </p>
                  )}

                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeSection === "plan" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Plan & Upgrade
                </CardTitle>
                <CardDescription>Review your plan and available credits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Plan</p>
                    <p className="mt-2 text-lg font-semibold">{planName}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="mt-2 text-lg font-semibold capitalize">
                      {userProfile?.subscriptionStatus ?? "active"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{creditLabel}</p>
                    <p className="mt-2 text-lg font-semibold">
                      {creditsRemaining !== null ? `${creditsRemaining} left` : planError ?? "Loading"}
                    </p>
                  </div>
                </div>

                {creditsLimit !== null && creditsUsed !== null && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Credits used</span>
                      <span>{creditsUsed} / {creditsLimit}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    {userPlan?.periodEnd && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Credits reset on {new Date(userPlan.periodEnd).toLocaleDateString()}.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Need more practice time?</p>
                      <p className="text-sm text-muted-foreground">
                        Upgrade details and self-serve checkout are coming soon. Contact us and we&apos;ll help you move to Performer.
                      </p>
                    </div>
                    <Button asChild>
                      <a href="mailto:hello@convosparr.com?subject=Upgrade Plan">
                        <Zap className="w-4 h-4" />
                        Contact to Upgrade
                      </a>
                    </Button>
                  </div>
                </div>

                <Button variant="outline" onClick={refreshPlan}>
                  Refresh Credits
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
