export function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Name is required" };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  return { valid: true };
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { valid: true }; // Phone is optional
  }
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(trimmed.replace(/\s/g, ""))) {
    return { valid: false, error: "Please enter a valid phone number" };
  }
  return { valid: true };
}
