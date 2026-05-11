const ACTION_ERROR_MESSAGES: Record<string, string> = {
  forbidden: "You do not have permission to do that.",
  unauthorized: "Please sign in again.",
  Unauthorized: "Please sign in again.",
  invalid_input: "Check the fields and try again.",
  reject_requires_note: "Add a comment when rejecting.",
  required_fields: "Complete the required fields.",
  plate_required: "Enter a plate number.",
  invalid_status: "Choose a valid status.",
  invalid_transition: "This status change is not allowed.",
  key_invalid: "Use only letters, numbers, and dashes.",
  name_required: "Enter a name.",
  title_required: "Enter a title.",
  title_and_date_required: "Enter a title and date.",
  last_admin: "You cannot remove the last admin.",
  user_not_found: "No user with that email was found.",
  bad_email: "Enter a valid email.",
};

export function getActionErrorMessage(
  error: string | undefined,
  fallback = "Could not complete the action.",
) {
  if (!error) return fallback;
  if (error.includes("Reference:")) return error;
  if (error.startsWith("rate_limited:")) {
    return "Too many attempts. Please try again later.";
  }
  return ACTION_ERROR_MESSAGES[error] ?? fallback;
}
