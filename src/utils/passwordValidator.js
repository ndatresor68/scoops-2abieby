/**
 * Password validation utility based on settings
 */

export function validatePassword(password, policy) {
  const errors = []

  if (!password) {
    return { valid: false, errors: ["Password is required"] }
  }

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`)
  }

  // Check uppercase requirement
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  // Check lowercase requirement
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  // Check number requirement
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  // Check special character requirement
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function getPasswordRequirementsText(policy) {
  const requirements = []

  requirements.push(`At least ${policy.minLength} characters`)

  if (policy.requireUppercase) {
    requirements.push("One uppercase letter")
  }

  if (policy.requireLowercase) {
    requirements.push("One lowercase letter")
  }

  if (policy.requireNumbers) {
    requirements.push("One number")
  }

  if (policy.requireSpecialChars) {
    requirements.push("One special character")
  }

  return requirements.join(", ")
}
