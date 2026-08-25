import re

def normalize_phone(phone: str) -> str | None:
    """Normalize a phone number to +254XXXXXXXXX format."""
    if not phone:
        return None
    # Remove all non-digit characters except leading '+'
    cleaned = re.sub(r'[^0-9+]', '', phone.strip())
    if cleaned.startswith('+254'):
        return cleaned[:13]  # +254 + 9 digits
    if cleaned.startswith('254'):
        return '+' + cleaned[:12]
    if cleaned.startswith('0'):
        return '+254' + cleaned[1:]
    if len(cleaned) == 9:
        return '+254' + cleaned
    # Fallback: return as-is (should be valid)
    return phone
