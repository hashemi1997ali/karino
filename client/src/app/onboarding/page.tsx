import { AuthGate } from "@/features/auth/auth-gate";
import { OnboardingView } from "@/features/onboarding/onboarding-view";

export default function OnboardingPage() {
  return (
    <AuthGate>
      <OnboardingView />
    </AuthGate>
  );
}
