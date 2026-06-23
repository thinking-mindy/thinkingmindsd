pub const FISCAL_OFFLINE_MESSAGE: &str = "ZIMRA fiscalisation requires an internet connection to FDMS. This sale was completed without a fiscal receipt. Sync when you are back online.";

pub const FISCAL_OFFLINE_CREDIT_NOTE_MESSAGE: &str = "ZIMRA credit note requires an internet connection to FDMS. The refund was recorded locally without a fiscal credit note. Submit to FDMS when you are back online.";

pub fn is_fdms_connectivity_error(error: &str) -> bool {
    let lower = error.to_lowercase();
    if lower.contains("fdms request timed out") {
        return true;
    }
    if lower.contains("connection refused")
        || lower.contains("connection reset")
        || lower.contains("dns error")
        || lower.contains("failed to lookup")
        || lower.contains("network error")
        || lower.contains("getaddrinfo")
        || lower.contains("socket hang up")
        || lower.contains("timed out")
        || lower.contains("not connected")
        || lower.contains("unreachable")
    {
        return true;
    }
    if let Some(code) = error
        .split_whitespace()
        .find(|p| p.starts_with("FDMS"))
        .and_then(|p| p.strip_prefix("FDMS"))
    {
        if matches!(code.trim(), "500" | "502" | "503" | "504") {
            return true;
        }
    }
    lower.contains("fdms 500")
        || lower.contains("fdms 502")
        || lower.contains("fdms 503")
        || lower.contains("fdms 504")
}
